import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MATERIAL_ORDER, MATERIALS, SHOWCASE } from './config.js';
import { disposeObject, normalizeObject } from './utils.js';

const ENV_INTENSITY = {
  metal: 1.45,
  ceramic: 1.05,
  glass: 1.15,
  coloredGlass: 1.0,
  whitePorcelain: 1.0,
  marble: 0.8,
  felt: 0.55
};

function tuneMaterial(material, key) {
  material.envMapIntensity = ENV_INTENSITY[key] ?? 0.72;
  material.needsUpdate = true;
}

function countTriangles(root) {
  let triangles = 0;
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry;
    if (geometry.index) {
      triangles += geometry.index.count / 3;
    } else if (geometry.attributes.position) {
      triangles += geometry.attributes.position.count / 3;
    }
  });
  return Math.round(triangles);
}

export class ModelManager {
  constructor({ scene, stageTop, onBackgroundError = console.warn }) {
    this.scene = scene;
    this.stageTop = stageTop;
    this.onBackgroundError = onBackgroundError;
    this.loader = new GLTFLoader();
    this.stageRoot = new THREE.Group();
    this.stageRoot.name = 'CharacterStageRoot';
    this.stageRoot.position.y = stageTop;
    scene.add(this.stageRoot);

    this.entries = new Map();
    this.pending = new Map();
    this.currentKey = null;
    this.currentGroup = null;
    this.switchChain = Promise.resolve();
    this.cacheLimit = 2;
    this.usageCounter = 0;
    // 动作播放时会把当前材质的 material 借给动作模型，这份材质不能被缓存淘汰掉。
    this.protectedKey = null;
    this.autoRotateEnabled = true;
    this.autoRotatePaused = false;
    this.autoRotateSpeed = 0.22;
  }

  ensureLoaded(key, onProgress = null) {
    if (this.entries.has(key)) {
      return Promise.resolve(this.entries.get(key));
    }

    if (this.pending.has(key)) {
      if (onProgress) this.pending.get(key).listeners.add(onProgress);
      return this.pending.get(key).promise;
    }

    const config = MATERIALS[key];
    if (!config) return Promise.reject(new Error(`未知材质：${key}`));

    const listeners = new Set();
    if (onProgress) listeners.add(onProgress);

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        config.file,
        (gltf) => {
          try {
            const entry = this.prepareEntry(key, gltf);
            this.entries.set(key, entry);
            resolve(entry);
          } catch (error) {
            reject(error);
          }
        },
        (event) => {
          if (!event.total) return;
          const value = event.loaded / event.total;
          listeners.forEach((listener) => listener(value));
        },
        (error) => {
          reject(new Error(`${config.file} 加载失败：${error?.message || '文件不可用'}`));
        }
      );
    }).finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, { promise, listeners });
    return promise;
  }

  prepareEntry(key, gltf) {
    const group = new THREE.Group();
    group.name = `Material_${key}`;
    const model = gltf.scene;
    const dimensions = normalizeObject(model, SHOWCASE.modelHeight);
    const materials = new Set();

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      const sourceMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const cloned = sourceMaterials.map((source) => {
        const material = source.clone();
        tuneMaterial(material, key);
        materials.add(material);
        return material;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
    });

    group.add(model);
    group.visible = false;
    group.userData.materials = [...materials];
    group.userData.metrics = {
      triangles: countTriangles(model),
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      animations: gltf.animations.length
    };
    group.userData.key = key;
    group.userData.file = MATERIALS[key].file;
    group.userData.lastUsed = ++this.usageCounter;
    this.stageRoot.add(group);

    return { key, group, model, gltf, ...group.userData.metrics, lastUsed: group.userData.lastUsed };
  }

  setGroupOpacity(group, opacity, fadeState = false) {
    group.userData.materials.forEach((material) => {
      material.transparent = fadeState || opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = !fadeState || opacity > 0.92;
      material.needsUpdate = true;
    });
  }

  fadeBetween(previousGroup, nextGroup, duration = 520) {
    const startedAt = performance.now();
    nextGroup.visible = true;
    this.setGroupOpacity(nextGroup, 0, true);
    if (previousGroup) this.setGroupOpacity(previousGroup, 1, true);

    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.setGroupOpacity(nextGroup, eased, progress < 1);
        if (previousGroup) this.setGroupOpacity(previousGroup, 1 - eased, progress < 1);

        if (progress < 1) {
          requestAnimationFrame(tick);
          return;
        }

        this.setGroupOpacity(nextGroup, 1, false);
        if (previousGroup) {
          previousGroup.visible = false;
          this.setGroupOpacity(previousGroup, 1, false);
        }
        resolve();
      };

      requestAnimationFrame(tick);
    });
  }

  show(key, { immediate = false, onProgress = null } = {}) {
    const run = async () => {
      const entry = await this.ensureLoaded(key, onProgress);
      if (this.currentKey === key && this.currentGroup?.visible) {
        return entry;
      }

      const previous = this.currentGroup;
      this.currentKey = key;
      this.currentGroup = entry.group;
      entry.group.userData.lastUsed = ++this.usageCounter;

      if (!previous || immediate) {
        this.entries.forEach((item) => {
          item.group.visible = item.key === key;
          this.setGroupOpacity(item.group, item.key === key ? 1 : 0, false);
        });
      } else {
        await this.fadeBetween(previous, entry.group);
      }

      entry.group.visible = true;
      this.enforceCacheLimit();
      return entry;
    };

    this.switchChain = this.switchChain.then(run, run);
    return this.switchChain;
  }

  setVisible(visible) {
    if (this.currentGroup) this.currentGroup.visible = visible;
  }

  async preloadNearby(count = 2) {
    const currentIndex = MATERIAL_ORDER.indexOf(this.currentKey);
    if (currentIndex < 0) return;

    const candidates = [];
    for (let offset = 1; offset <= count; offset += 1) {
      const key = MATERIAL_ORDER[(currentIndex + offset) % MATERIAL_ORDER.length];
      if (!this.entries.has(key) && !this.pending.has(key)) candidates.push(key);
    }

    for (const key of candidates) {
      try {
        await this.ensureLoaded(key);
      } catch (error) {
        this.onBackgroundError(error);
      }
    }
  }

  disposeEntry(key) {
    const entry = this.entries.get(key);
    if (!entry || key === this.currentKey || key === this.protectedKey) return;
    this.entries.delete(key);
    disposeObject(entry.group);
    entry.group.removeFromParent();
  }

  enforceCacheLimit() {
    if (this.entries.size <= this.cacheLimit) return;
    const candidates = [...this.entries.values()]
      .filter((entry) => entry.key !== this.currentKey && entry.key !== this.protectedKey)
      .sort((a, b) => a.group.userData.lastUsed - b.group.userData.lastUsed);

    while (this.entries.size > this.cacheLimit && candidates.length) {
      this.disposeEntry(candidates.shift().key);
    }
  }

  /** 标记正在被动作模型借用的材质，避免切材质时把它连贴图一起释放。 */
  protect(key = null) {
    this.protectedKey = key;
  }

  setAutoRotate(enabled) {
    this.autoRotateEnabled = enabled;
  }

  toggleAutoRotate() {
    this.autoRotatePaused = !this.autoRotatePaused;
    return !this.autoRotatePaused;
  }

  get isAutoRotating() {
    return this.autoRotateEnabled && !this.autoRotatePaused;
  }

  getCurrentEntry() {
    return this.currentGroup ? this.entries.get(this.currentKey) : null;
  }

  hasEntry(key) {
    return this.entries.has(key);
  }

  update(delta, elapsed) {
    if (this.isAutoRotating) {
      this.stageRoot.rotation.y += delta * this.autoRotateSpeed;
    }
    this.stageRoot.position.y = this.stageTop + Math.sin(elapsed * 1.25) * 0.012;
  }

  dispose() {
    for (const entry of this.entries.values()) {
      disposeObject(entry.group);
    }
    this.entries.clear();
    this.stageRoot.removeFromParent();
  }
}
