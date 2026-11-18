import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObject } from '../utils.js';

/**
 * 静态摆件通用加载器：按高度归一化、底面贴地、延迟加载。
 * 用于鼓、香炉这类不需要骨骼动画的场景资产。
 */
export function createStaticOrnament({
  url,
  position,
  height,
  rotationY = 0,
  delay = 3000,
  float = 0,
  envMapIntensity = 0.75,
  castShadow = true
}) {
  const group = new THREE.Group();
  group.name = `Ornament_${url.split('/').pop()}`;
  group.visible = false;

  const loader = new GLTFLoader();
  let disposed = false;
  let model = null;
  let timer = null;

  const load = () => {
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;

        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = height / (size.y || 1);
        model.scale.setScalar(scale);

        model.updateMatrixWorld(true);
        const scaled = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        scaled.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= scaled.min.y;

        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = castShadow;
          child.receiveShadow = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (!material) return;
            material.envMapIntensity = envMapIntensity;
            material.needsUpdate = true;
          });
        });

        group.position.fromArray(position);
        group.rotation.y = rotationY;
        group.add(model);
        group.visible = true;
      },
      undefined,
      (error) => {
        console.warn(`[Ornament] ${url} 加载失败：`, error?.message || error);
      }
    );
  };

  timer = window.setTimeout(load, delay);

  return {
    group,
    update(delta, elapsed) {
      if (!group.visible || !float) return;
      group.position.y = position[1] + Math.sin(elapsed * 0.45) * float;
    },
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
      if (model) disposeObject(group);
      group.removeFromParent();
    }
  };
}
