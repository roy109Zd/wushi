import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SHOWCASE } from './config.js';

function createWarmLighting(scene, lowPower = false) {
  const hemisphere = new THREE.HemisphereLight(0xffe4bc, 0x180707, 1.25);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xffd8b0, 0.42);
  scene.add(ambient);

  const key = new THREE.SpotLight(0xffd39b, 620, 30, 0.34, 0.72, 2);
  key.position.set(2.8, 9.2, 6.2);
  key.target.position.set(0, 1.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(lowPower ? 512 : 1024, lowPower ? 512 : 1024);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 24;
  scene.add(key, key.target);

  const rim = new THREE.SpotLight(0xc98567, 430, 26, 0.46, 0.85, 2);
  rim.position.set(-5.2, 7.4, -6.5);
  rim.target.position.set(0, 2.1, 0);
  scene.add(rim, rim.target);

  const frontFill = new THREE.DirectionalLight(0xffd8b5, 1.5);
  frontFill.position.set(-6, 4.5, 7);
  scene.add(frontFill);

  return {
    hemisphere,
    ambient,
    key,
    rim,
    frontFill,
    dispose() {
      [hemisphere, ambient, key, rim, frontFill].forEach((light) => {
        light.dispose?.();
        light.removeFromParent();
      });
      key.target.removeFromParent();
      rim.target.removeFromParent();
    }
  };
}

/**
 * 三套布景光调的物理参数。与 config.js 中的 STAGE_MOODS 一一对应，
 * 只改灯光、雾、背景与曝光，不动展厅几何，切换成本几乎为零。
 */
const MOOD_SETTINGS = {
  ink: {
    background: 0x130807,
    fog: 0x160908,
    fogDensity: 0.011,
    exposure: 1.1,
    environmentIntensity: 0.42,
    hemisphere: { sky: 0xffe4bc, ground: 0x2a100c, intensity: 1.8 },
    ambient: { color: 0xffd8b0, intensity: 0.68 },
    key: { color: 0xffd39b, intensity: 640 },
    rim: { color: 0xc98567, intensity: 440 },
    fill: { color: 0xffd8b5, intensity: 1.85 }
  },
  moon: {
    background: 0x14181a,
    fog: 0x161b1d,
    fogDensity: 0.015,
    exposure: 1.06,
    environmentIntensity: 0.8,
    hemisphere: { sky: 0xf2fbff, ground: 0x1a2326, intensity: 2.2 },
    ambient: { color: 0xdff0f7, intensity: 0.95 },
    key: { color: 0xffffff, intensity: 780 },
    rim: { color: 0x9fc8e0, intensity: 420 },
    fill: { color: 0xeaf6ff, intensity: 1.8 }
  },
  cinnabar: {
    background: 0x1e0605,
    fog: 0x270806,
    fogDensity: 0.013,
    exposure: 1.2,
    environmentIntensity: 0.38,
    hemisphere: { sky: 0xffcf9f, ground: 0x2a0805, intensity: 1.85 },
    ambient: { color: 0xffc48f, intensity: 0.78 },
    key: { color: 0xffb066, intensity: 780 },
    rim: { color: 0xff5a3c, intensity: 560 },
    fill: { color: 0xffb488, intensity: 1.7 }
  }
};

export function createSceneContext(container) {
  const lowPower = window.matchMedia('(max-width: 820px)').matches
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const maxPixelRatio = lowPower ? 1.25 : 1.6;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x130807);
  scene.fog = new THREE.FogExp2(0x160908, 0.022);

  const camera = new THREE.PerspectiveCamera(
    36,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
    0.05,
    80
  );
  camera.position.fromArray(SHOWCASE.defaultCamera);
  camera.lookAt(new THREE.Vector3().fromArray(SHOWCASE.defaultTarget));

  const renderer = new THREE.WebGLRenderer({
    antialias: !lowPower,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.id = 'webgl-canvas';
  renderer.domElement.setAttribute('aria-label', '东方醒狮三维艺术展厅');
  container.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('materialmagician:webglcontextlost'));
  }, false);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment(renderer);
  const environmentTexture = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  scene.environment = environmentTexture;
  scene.environmentIntensity = 0.38;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  const lighting = createWarmLighting(scene, lowPower);
  let disposed = false;
  let currentMood = 'ink';

  function setMood(id) {
    const mood = MOOD_SETTINGS[id];
    if (!mood) return currentMood;

    currentMood = id;
    scene.background.setHex(mood.background);
    scene.fog.color.setHex(mood.fog);
    scene.fog.density = mood.fogDensity;
    scene.environmentIntensity = mood.environmentIntensity;
    renderer.toneMappingExposure = mood.exposure;

    lighting.hemisphere.color.setHex(mood.hemisphere.sky);
    lighting.hemisphere.groundColor.setHex(mood.hemisphere.ground);
    lighting.hemisphere.intensity = mood.hemisphere.intensity;

    lighting.ambient.color.setHex(mood.ambient.color);
    lighting.ambient.intensity = mood.ambient.intensity;

    lighting.key.color.setHex(mood.key.color);
    lighting.key.intensity = mood.key.intensity;

    lighting.rim.color.setHex(mood.rim.color);
    lighting.rim.intensity = mood.rim.intensity;

    lighting.frontFill.color.setHex(mood.fill.color);
    lighting.frontFill.intensity = mood.fill.intensity;

    return currentMood;
  }

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.fov = width < 760 ? 46 : 36;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(width, height, false);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize, { passive: true });

  function render() {
    if (!disposed) renderer.render(scene, camera);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('resize', onResize);
    lighting.dispose();
    environmentTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    scene,
    lowPower,
    maxPixelRatio,
    camera,
    renderer,
    container,
    lighting,
    resize,
    render,
    setMood,
    get mood() {
      return currentMood;
    },
    dispose
  };
}
