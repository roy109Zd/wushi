import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ACTIONS, SHOWCASE } from './config.js';
import { disposeObject, normalizeObject } from './utils.js';

/**
 * 把带位移的骨骼动画压成原地循环：只锁 Hips / Root 的 X、Z，保留 Y（起伏）。
 * 翻滚、奔跑的原始动画会整体前移，直接播会走出中央展台；
 * 展示场景只需要「原地表演」，不需要真实位移。
 */
function flattenRootMotion(clip) {
  // GLTFLoader 会把节点名里的冒号洗成下划线（mixamorig:Hips → mixamorig_Hips），两种都认
  const isRootBone = (name) => /(^|[.:_])(Hips|Root)$/.test(name);

  clip.tracks.forEach((track) => {
    if (!track.name.endsWith('.position')) return;
    const bone = track.name.slice(0, -'.position'.length);
    if (!isRootBone(bone)) return;

    const values = track.values;
    const x0 = values[0];
    const z0 = values[2];
    for (let i = 0; i < values.length; i += 3) {
      values[i] = x0;
      values[i + 2] = z0;
    }
  });

  return clip;
}

export class ActionTheater {
  constructor({ stageRoot, modelManager, onFinished = () => {} }) {
    this.stageRoot = stageRoot;
    this.modelManager = modelManager;
    this.onFinished = onFinished;
    this.loader = new GLTFLoader();
    this.entries = new Map();
    this.pending = new Map();
    this.cacheLimit = 2;
    this.mixer = null;
    this.currentAction = null;
    this.currentActionId = null;
    this.currentEntry = null;
    // 从当前材质模型借来的材质副本（只复制 material，贴图仍共享）
    this.appliedMaterials = [];
    this.boundFinished = (event) => {
      if (event.action !== this.currentAction) return;
      const finishedId = this.currentActionId;
      this.stop();
      this.onFinished(finishedId);
    };
  }

  getDefinition(id) {
    return ACTIONS.find((action) => action.id === id && action.available && action.kind === 'clip');
  }

  loadAction(id, onProgress = null) {
    if (this.entries.has(id)) return Promise.resolve(this.entries.get(id));

    const definition = this.getDefinition(id);
    if (!definition?.file) return Promise.reject(new Error(`动作 ${id} 缺少可播放 GLB`));

    if (this.pending.has(id)) {
      if (onProgress) this.pending.get(id).listeners.add(onProgress);
      return this.pending.get(id).promise;
    }

    const listeners = new Set();
    if (onProgress) listeners.add(onProgress);

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        definition.file,
        (gltf) => {
          try {
            const group = new THREE.Group();
            group.name = `SkeletalAction_${id}`;
            const model = gltf.scene;
            const dimensions = normalizeObject(model, SHOWCASE.modelHeight);
            let triangleCount = 0;

            model.traverse((child) => {
              if (!child.isMesh) return;
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = false;
              const geometry = child.geometry;
              triangleCount += geometry?.index
                ? geometry.index.count / 3
                : (geometry?.attributes?.position?.count || 0) / 3;
            });

            group.add(model);
            group.visible = false;
            this.stageRoot.add(group);

            if (!gltf.animations.length) {
              disposeObject(group);
              reject(new Error(`${definition.name} GLB 未检测到动画片段`));
              return;
            }

            const entry = {
              id,
              definition,
              group,
              model,
              gltf,
              clip: flattenRootMotion(gltf.animations[0]),
              dimensions,
              triangles: Math.round(triangleCount),
              skins: gltf.skins?.length || 0
            };
            this.entries.set(id, entry);
            resolve(entry);
          } catch (error) {
            reject(error);
          }
        },
        (event) => {
          if (!event.total) return;
          const progress = event.loaded / event.total;
          listeners.forEach((listener) => listener(progress));
        },
        (error) => reject(new Error(`${definition.name} 骨骼动作加载失败：${error?.message || '文件不可用'}`))
      );
    }).finally(() => {
      this.pending.delete(id);
    });

    this.pending.set(id, { promise, listeners });
    return promise;
  }

  /**
   * 把当前材质模型的 PBR 材质复制到动作模型的网格上。
   * 三套材质与动作文件共用同一份网格（170,884 顶点 / 591,405 索引），
   * 所以这里只换 material，不会错位；贴图共享，避免重复占显存。
   */
  applyMaterialFrom(group) {
    if (!this.currentEntry || !group) return false;

    const sources = [];
    group.traverse((child) => {
      if (!child.isMesh) return;
      sources.push(Array.isArray(child.material) ? child.material : [child.material]);
    });
    if (!sources.length) return false;

    this.releaseAppliedMaterials();

    const targets = [];
    this.currentEntry.model.traverse((child) => {
      if (child.isMesh) targets.push(child);
    });

    targets.forEach((mesh, index) => {
      const sourceSet = sources[index % sources.length];
      const clones = sourceSet.map((material) => {
        const clone = material.clone();
        clone.transparent = false;
        clone.opacity = 1;
        clone.depthWrite = true;
        clone.needsUpdate = true;
        this.appliedMaterials.push(clone);
        return clone;
      });
      mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
    });

    return true;
  }

  releaseAppliedMaterials() {
    this.appliedMaterials.forEach((material) => material.dispose());
    this.appliedMaterials = [];
  }

  async play(id, { onProgress = null, onStart = null } = {}) {
    const definition = this.getDefinition(id);
    if (!definition) throw new Error(`动作 ${id} 尚未绑定骨骼动画`);

    this.stop({ restoreModel: false });
    const entry = await this.loadAction(id, onProgress);
    this.currentEntry = entry;

    this.entries.forEach((item) => { item.group.visible = item.id === id; });
    this.modelManager.setVisible(false);

    // 先换成当前材质再显示，避免动作开始的第一帧闪回动作文件自带的表面。
    const sourceEntry = this.modelManager.getCurrentEntry?.();
    if (sourceEntry?.group) {
      this.applyMaterialFrom(sourceEntry.group);
      this.modelManager.protect?.(sourceEntry.key);
    }

    entry.group.visible = true;

    this.mixer = new THREE.AnimationMixer(entry.model);
    this.currentAction = this.mixer.clipAction(entry.clip);
    this.currentAction.reset();
    this.currentAction.enabled = true;

    if (definition.loop) {
      this.currentAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      this.currentAction.setLoop(THREE.LoopOnce, 1);
      this.currentAction.clampWhenFinished = true;
    }

    this.currentAction.play();
    this.currentActionId = id;
    this.enforceCacheLimit(id);
    this.mixer.addEventListener('finished', this.boundFinished);
    onStart?.({
      id,
      duration: entry.clip.duration,
      skins: entry.skins,
      triangles: entry.triangles,
      loop: Boolean(definition.loop)
    });

    return {
      id,
      duration: entry.clip.duration,
      actualSkeleton: entry.skins > 0,
      loop: Boolean(definition.loop)
    };
  }

  disposeAction(id) {
    const entry = this.entries.get(id);
    if (!entry || id === this.currentActionId) return;
    this.entries.delete(id);
    disposeObject(entry.group);
    entry.group.removeFromParent();
  }

  enforceCacheLimit(activeId = this.currentActionId) {
    if (this.entries.size <= this.cacheLimit) return;
    const candidates = [...this.entries.keys()].filter((id) => id !== activeId);
    while (this.entries.size > this.cacheLimit && candidates.length) {
      this.disposeAction(candidates.shift());
    }
  }

  stop({ restoreModel = true } = {}) {
    const wasPlaying = Boolean(this.currentActionId);
    if (this.mixer) {
      this.mixer.removeEventListener('finished', this.boundFinished);
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }
    this.currentAction = null;
    this.currentActionId = null;
    this.currentEntry = null;
    this.releaseAppliedMaterials();
    this.modelManager.protect?.(null);
    this.entries.forEach((entry) => { entry.group.visible = false; });
    if (restoreModel) this.modelManager.setVisible(true);
    return wasPlaying;
  }

  update(delta) {
    this.mixer?.update(delta);
  }

  get isPlaying() {
    return Boolean(this.currentActionId);
  }

  dispose() {
    this.stop();
    this.entries.forEach((entry) => disposeObject(entry.group));
    this.entries.clear();
  }
}
