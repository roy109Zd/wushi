import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeObject } from '../utils.js';

const DEFAULT_TARGET_SIZE = 24;
const DEFAULT_TARGET_HEIGHT = 8.5;

function fitImportedScene(sceneObject, manifest = null) {
  if (manifest?.transform) {
    const { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = manifest.transform;
    sceneObject.position.fromArray(position);
    sceneObject.rotation.set(...rotation);
    sceneObject.scale.setScalar(scale);
  }

  sceneObject.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(sceneObject);
  let size = new THREE.Vector3();
  box.getSize(size);

  if (manifest?.autoFit !== false && size.x > 0 && size.y > 0 && size.z > 0) {
    const footprint = Math.max(size.x, size.z);
    const fitScale = Math.min(
      DEFAULT_TARGET_SIZE / footprint,
      DEFAULT_TARGET_HEIGHT / size.y
    );
    if (Number.isFinite(fitScale) && fitScale > 0) {
      sceneObject.scale.multiplyScalar(fitScale);
      sceneObject.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(sceneObject);
    }
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  sceneObject.position.x -= center.x;
  sceneObject.position.z -= center.z;
  sceneObject.position.y -= box.min.y;
  sceneObject.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(sceneObject);
  size = new THREE.Vector3();
  box.getSize(size);

  return {
    bounds: {
      minX: box.min.x + 0.65,
      maxX: box.max.x - 0.65,
      minZ: box.min.z + 0.65,
      maxZ: box.max.z - 0.65
    },
    size
  };
}

/**
 * 群核 / SpatialGen 接入约定：
 * - 首选：单文件 GLB，纹理内嵌。
 * - 本地预览：在空间面板中直接选择 GLB。
 * - 项目资产：放入 public/spatialgen/hall.glb，并在 manifest.json 配 stageTop。
 * - manifest 可写：
 *   { name, scene: "./hall.glb", stageTop: 0.9, autoFit: true,
 *     transform: { position:[0,0,0], rotation:[0,0,0], scale:1 },
 *     colliders:[{type:"circle",x:0,z:0,radius:2.8}] }
 */
export class SpatialGenLoader {
  constructor(loader = new GLTFLoader()) {
    this.loader = loader;
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  getConfiguredUrl() {
    const queryUrl = new URLSearchParams(window.location.search).get('spatialgen');
    return queryUrl || import.meta.env.VITE_SPATIALGEN_MANIFEST_URL || '';
  }

  async load(url = this.getConfiguredUrl(), onProgress = () => {}) {
    if (!url) return null;

    if (/.(glb|gltf)(?:\?.*)?$/i.test(url)) {
      return this.loadGltf(url, null, onProgress);
    }

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`SpatialGen manifest 请求失败：${response.status}`);
    }

    const manifest = await response.json();
    const sceneUrl = manifest.scene || manifest.model || manifest.glb || manifest.url;
    if (!sceneUrl) {
      throw new Error('SpatialGen manifest 缺少 scene/model/glb/url 字段');
    }

    return this.loadGltf(
      new URL(sceneUrl, new URL(url, window.location.href)).href,
      manifest,
      onProgress
    );
  }

  async loadFile(file, onProgress = () => {}) {
    if (!file || !/\.glb$/i.test(file.name)) {
      throw new Error('请导入单文件 GLB。若群核导出的是 glTF，请连同纹理一起转换为 GLB。');
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      return await this.loadGltf(
        objectUrl,
        { name: file.name.replace(/\.glb$/i, ''), autoFit: true },
        onProgress
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  loadGltf(url, manifest, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const group = new THREE.Group();
          group.name = 'SpatialGenHall';
          const sceneObject = gltf.scene;
          sceneObject.traverse((child) => {
            if (!child.isMesh) return;
            child.castShadow = false;
            child.receiveShadow = true;
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((material) => {
                material.envMapIntensity = Math.max(material.envMapIntensity || 0, 0.65);
              });
            }
          });

          const fitted = fitImportedScene(sceneObject, manifest);
          group.add(sceneObject);

          const colliders = Array.isArray(manifest?.colliders)
            ? manifest.colliders
            : [{ type: 'circle', x: 0, z: 0, radius: 2.85 }];

          resolve({
            group,
            source: 'spatialgen',
            label: manifest?.name || '群核空间模型',
            stageTop: Number.isFinite(manifest?.stageTop) ? manifest.stageTop : 0.88,
            colliders,
            bounds: fitted.bounds,
            size: fitted.size,
            skeletonSource: url,
            update() {},
            dispose() {
              disposeObject(group);
              group.removeFromParent();
            }
          });
        },
        (event) => {
          if (!event.total) return;
          onProgress(event.loaded / event.total);
        },
        (error) => reject(new Error(`空间 GLB 加载失败：${error?.message || '文件不可用'}`))
      );
    });
  }
}
