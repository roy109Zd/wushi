import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STORY_CHAPTERS } from '../story.js';

const STORY_MODEL_FILES = {
  dot: '/models/story-dot.glb',
  rise: '/models/story-rise.glb',
  green: '/models/story-green.glb',
  drunk: '/models/story-drunk.glb',
  close: '/models/story-close.glb'
};

const storyLoader = new GLTFLoader();

/** 生成资产按 0.72 单位归一化、居中、底面贴台面。 */
function loadStoryModel(id, onLoaded) {
  const url = STORY_MODEL_FILES[id];
  if (!url) return;
  storyLoader.load(url, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 0.72 / (Math.max(size.x, size.y, size.z) || 1);
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
      child.castShadow = true;
      child.receiveShadow = true;
    });

    onLoaded(model);
  }, undefined, (error) => {
    console.warn('[Story] 生成资产加载失败，保留程序化占位：', id, error?.message || error);
  });
}

function createPanelTexture(chapter) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(18, 8, 6, 0.92)';
  ctx.fillRect(0, 0, 640, 320);
  ctx.strokeStyle = 'rgba(210, 168, 102, 0.6)';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 612, 292);

  ctx.fillStyle = 'rgba(226, 188, 123, 0.85)';
  ctx.font = '500 34px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(chapter.index, 44, 84);

  ctx.fillStyle = 'rgba(244, 226, 198, 0.95)';
  ctx.font = '600 96px "Songti SC", "STSong", serif';
  ctx.fillText(chapter.title, 44, 190);

  ctx.fillStyle = 'rgba(226, 188, 123, 0.6)';
  ctx.font = '400 24px Georgia, serif';
  ctx.fillText(chapter.en, 44, 250);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createProp(id, mats) {
  const prop = new THREE.Group();

  if (id === 'dot') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.0, 10), mats.wood);
    handle.rotation.z = 0.35;
    handle.position.y = 0.5;
    prop.add(handle);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 12), mats.cinnabar);
    tip.position.set(-0.17, 0.02, 0);
    tip.rotation.z = 0.35 + Math.PI;
    prop.add(tip);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 18), mats.cinnabar);
    dish.position.set(0.18, 0.05, 0.1);
    prop.add(dish);
  } else if (id === 'rise') {
    [0.45, -0.45].forEach((tilt) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 10), mats.woodEdge);
      stick.position.y = 0.55;
      stick.rotation.z = tilt * 0.5;
      prop.add(stick);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mats.brassBright);
      head.position.set(Math.sin(tilt * 0.5) * -0.55, 1.05, 0);
      prop.add(head);
    });
  } else if (id === 'green') {
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), mats.leaf);
      const angle = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.16, 0.28, Math.sin(angle) * 0.16);
      leaf.rotation.z = Math.cos(angle) * 0.5;
      leaf.rotation.x = Math.sin(angle) * 0.5;
      prop.add(leaf);
    }
    const envelope = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.03), mats.cinnabar);
    envelope.position.set(0, 0.18, 0.3);
    prop.add(envelope);
  } else if (id === 'drunk') {
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), mats.jar);
    jar.scale.y = 1.15;
    jar.position.y = 0.4;
    prop.add(jar);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 14), mats.jar);
    neck.position.y = 0.76;
    prop.add(neck);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 14), mats.cinnabar);
    seal.position.y = 0.88;
    prop.add(seal);
  } else {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), mats.cinnabar);
    ball.position.y = 0.42;
    prop.add(ball);
    [0, Math.PI / 3, -Math.PI / 3].forEach((rot) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 32), mats.brassBright);
      band.position.y = 0.42;
      band.rotation.y = rot;
      prop.add(band);
    });
  }

  return prop;
}

/**
 * 「舞狮故事」长廊：左墙前一列五座展台，每座一个符号化的 3D 道具
 * 加一块墙面说明牌，讲清点睛、起势、采青、醉狮、收势。
 */
export function createStoryGallery() {
  const group = new THREE.Group();
  group.name = 'StoryGallery';

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x2a211d, roughness: 0.7, metalness: 0.1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5a3320, roughness: 0.6, metalness: 0.1 }),
    woodEdge: new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.5, metalness: 0.15 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb0834a, roughness: 0.3, metalness: 0.8 }),
    brassBright: new THREE.MeshStandardMaterial({ color: 0xd8b06a, roughness: 0.25, metalness: 0.85 }),
    cinnabar: new THREE.MeshStandardMaterial({ color: 0xa8342a, roughness: 0.45, metalness: 0.1, emissive: 0x3a0d08, emissiveIntensity: 0.5 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.8, metalness: 0.02 }),
    jar: new THREE.MeshStandardMaterial({ color: 0x3f4a45, roughness: 0.35, metalness: 0.25 })
  };

  const stations = [];

  STORY_CHAPTERS.forEach((chapter) => {
    const station = new THREE.Group();
    station.position.set(chapter.position[0], 0, chapter.position[2]);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.9, 24), mats.stone);
    base.position.y = 0.45;
    base.castShadow = true;
    base.receiveShadow = true;
    station.add(base);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 36), mats.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.92;
    station.add(ring);

    const prop = createProp(chapter.id, mats);
    prop.position.y = 0.95;
    station.add(prop);

    // Lux3D 生成的道具加载完成后，替换掉程序化占位
    loadStoryModel(chapter.id, (model) => {
      station.remove(prop);
      prop.traverse((child) => {
        child.geometry?.dispose();
        if (child.material) {
          const list = Array.isArray(child.material) ? child.material : [child.material];
          list.forEach((material) => material.dispose());
        }
      });
      model.position.y += 0.95;
      station.add(model);
    });

    group.add(station);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.1),
      new THREE.MeshBasicMaterial({ map: createPanelTexture(chapter), transparent: true })
    );
    panel.position.set(-19.75, 3.1, chapter.position[2]);
    panel.rotation.y = Math.PI / 2;
    group.add(panel);

    stations.push({
      object: station,
      chapter
    });
  });

  return { group, stations };
}
