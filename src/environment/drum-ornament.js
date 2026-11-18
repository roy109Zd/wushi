import { createStaticOrnament } from './ornament.js';

/** 醒狮鼓（Lux3D text-to-3D 生成），落在展台左前方。 */
export function createDrumOrnament() {
  return createStaticOrnament({
    url: '/models/drum.glb',
    position: [-4.25, 0, 1.55],
    height: 1.5,
    rotationY: 0.55,
    delay: 3200,
    envMapIntensity: 0.75
  });
}
