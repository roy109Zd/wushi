import { createStaticOrnament } from './ornament.js';

/** 铜香炉（Lux3D text-to-3D 生成），落在展台右前方，与鼓形成左右配重。 */
export function createCenserOrnament() {
  return createStaticOrnament({
    url: '/models/censer.glb',
    position: [4.35, 0, 1.5],
    height: 2.2,
    rotationY: -0.55,
    delay: 3800,
    envMapIntensity: 0.7
  });
}
