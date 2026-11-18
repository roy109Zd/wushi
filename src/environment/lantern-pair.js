import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObject } from '../utils.js';

const LANTERN = {
  url: '/models/lantern.glb',
  height: 3.6,
  delay: 4200,
  // 左右各一，朝展台方向微微内转
  slots: [
    { position: [-7.7, 0, -1.1], rotationY: 0.5 },
    { position: [7.7, 0, -1.1], rotationY: -0.5 }
  ]
};

/**
 * 宫灯一对：GLB 只下载一次，第二盏用 clone 共享几何与材质，
 * 避免 20MB 资产被加载两遍。
 */
export function createLanternPair() {
  const root = new THREE.Group();
  root.name = 'LanternPair';
  root.visible = false;

  const instances = LANTERN.slots.map(() => {
    const slot = new THREE.Group();
    root.add(slot);
    return slot;
  });

  const loader = new GLTFLoader();
  let loaded = null;
  let disposed = false;
  let timer = null;

  const load = () => {
    loader.load(
      LANTERN.url,
      (gltf) => {
        if (disposed) return;

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        model.scale.setScalar(LANTERN.height / (size.y || 1));

        model.updateMatrixWorld(true);
        const scaled = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        scaled.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= scaled.min.y;

        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (!material) return;
            material.envMapIntensity = 0.85;
            material.needsUpdate = true;
          });
        });

        loaded = model;
        instances.forEach((slot, index) => {
          const instance = index === 0 ? model : model.clone(true);
          slot.add(instance);
          slot.position.fromArray(LANTERN.slots[index].position);
          slot.rotation.y = LANTERN.slots[index].rotationY;
        });

        root.visible = true;
      },
      undefined,
      (error) => {
        console.warn('[Lantern] 宫灯加载失败：', error?.message || error);
      }
    );
  };

  timer = window.setTimeout(load, LANTERN.delay);

  return {
    group: root,
    update() {},
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
      if (loaded) disposeObject(root);
      root.removeFromParent();
    }
  };
}
