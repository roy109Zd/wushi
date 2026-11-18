import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObject } from '../utils.js';

const DRAGON = {
  url: '/models/龙.glb',
  // 展厅坐标：月亮门前方、角色上方偏后，既不挡中央展台也不压住匾额
  position: [0, 5.85, -9.1],
  span: 3.0,
  delay: 2800
};

/**
 * 背景盘龙装饰。
 * 龙是静态网格（无骨骼、无动画），这里给它极慢的自转和上下浮动，
 * 让它读起来像悬浮的装置，而不是一个卡在空中的模型。
 * 19MB 的资产延迟到首屏之后再加载，避免和主角模型抢带宽。
 */
export function createDragonOrnament() {
  const group = new THREE.Group();
  group.name = 'DragonOrnament';
  group.visible = false;

  const loader = new GLTFLoader();
  let model = null;
  let disposed = false;
  let timer = null;

  const load = () => {
    loader.load(
      DRAGON.url,
      (gltf) => {
        if (disposed) return;

        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxSide = Math.max(size.x, size.y, size.z) || 1;
        const scale = DRAGON.span / maxSide;
        model.scale.setScalar(scale);

        model.updateMatrixWorld(true);
        const scaled = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        scaled.getCenter(center);

        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= center.y;

        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = false;
          child.receiveShadow = false;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (!material) return;
            material.envMapIntensity = 0.55;
            material.needsUpdate = true;
          });
        });

        group.position.fromArray(DRAGON.position);
        group.add(model);
        group.visible = true;
      },
      undefined,
      (error) => {
        console.warn('[Dragon] 背景盘龙加载失败：', error?.message || error);
      }
    );
  };

  timer = window.setTimeout(load, DRAGON.delay);

  return {
    group,
    update(delta, elapsed) {
      if (!group.visible) return;
      const radius = 8.6;
      const speed = 0.1;
      const angle = elapsed * speed;

      // 沿展厅上空缓慢盘旋，半径避开 ±10.2 的柱子
      group.position.x = Math.cos(angle) * radius;
      group.position.z = -2 + Math.sin(angle) * radius;
      group.position.y = 6.6 + Math.sin(elapsed * 0.42) * 0.14;
      group.rotation.y = -angle - Math.PI / 2;
    },
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
      if (model) disposeObject(group);
      group.removeFromParent();
    }
  };
}
