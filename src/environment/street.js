import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const streetLoader = new GLTFLoader();

/** 生成的建筑按高度归一化、居中、落地。 */

/** 同一建筑加载一次，按槽位克隆成一排。 */
function loadLandmarkRow(group, url, slots, height) {
  streetLoader.load(url, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    model.scale.setScalar(height / (size.y || 1));
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaled.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaled.min.y;

    const wrapper = new THREE.Group();
    wrapper.add(model);

    slots.forEach((slot) => {
      const instance = wrapper.clone(true);
      instance.position.set(slot.x, 0, slot.z);
      instance.rotation.y = slot.rotationY ?? 0;
      instance.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = true;
      });
      group.add(instance);
    });
  }, undefined, (error) => {
    console.warn('[Street] 建筑加载失败：', url, error?.message || error);
  });
}

function loadLandmark(group, url, { x, y = 0, z, height, rotationY = 0 }) {
  streetLoader.load(url, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    model.scale.setScalar(height / (size.y || 1));
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaled.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaled.min.y;
    model.position.y += y;
    model.position.x += x;
    model.position.z += z;
    model.rotation.y = rotationY;
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = true;
    });
    group.add(model);
  }, undefined, (error) => {
    console.warn('[Street] 建筑加载失败：', url, error?.message || error);
  });
}

const STREET = {
  startX: 20.4,
  endX: 39.5,
  halfWidth: 26,
  gateX: 47
};

function box(parent, material, size, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildMaterials() {
  return {
    road: new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.92, metalness: 0.02 }),
    earth: new THREE.MeshStandardMaterial({ color: 0x3b2b22, roughness: 0.95, metalness: 0.02 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4c2a1c, roughness: 0.72, metalness: 0.08 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x6a4a38, roughness: 0.85, metalness: 0.04, emissive: 0x2a170e, emissiveIntensity: 0.35 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x2a2522, roughness: 0.7, metalness: 0.12 }),
    lantern: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, emissive: 0x8a1d12, emissiveIntensity: 1.1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x8a2f24, roughness: 0.8, metalness: 0.02 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xe0b48c, roughness: 0.85, metalness: 0.02 })
  };
}

function buildShopRow(group, mats, z) {
  for (let i = 0; i < 3; i += 1) {
    const x = 24 + i * 8.2;
    box(group, mats.wall, [7.2, 4.4, 5.0], [x, 2.2, z]);
    box(group, mats.wood, [6.6, 3.0, 4.4], [x, 5.9, z]);
    box(group, mats.roof, [8.2, 0.5, 6.0], [x, 7.5, z]);
    box(group, mats.roof, [8.6, 0.24, 6.4], [x, 7.9, z]);
    // 二层栏杆
    box(group, mats.wood, [6.8, 0.16, 0.16], [x, 4.9, z - Math.sign(z) * 2.3]);
    // 门板
    box(group, mats.wood, [1.8, 3.4, 0.2], [x, 1.7, z - Math.sign(z) * 2.52]);
    // 檐下灯笼
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), mats.lantern);
    lantern.scale.y = 1.3;
    lantern.position.set(x + 3.0, 6.3, z - Math.sign(z) * 2.9);
    group.add(lantern);

    // 亮着的窗，避免整条街只有黑墙
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffb066 });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5), winMat);
    win.position.set(x, 3.3, z - Math.sign(z) * 2.56);
    win.rotation.y = z > 0 ? Math.PI : 0;
    group.add(win);

    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), winMat);
    win2.position.set(x, 6.4, z - Math.sign(z) * 2.26);
    win2.rotation.y = z > 0 ? Math.PI : 0;
    group.add(win2);
  }
}

function createNpc(mats, { fromX, toX, z, speed, phase, color }) {
  const npc = new THREE.Group();
  npc.position.set(fromX, 0, z);

  const robeMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 1.25, 12), robeMaterial);
  robe.position.y = 0.62;
  robe.castShadow = true;
  npc.add(robe);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), mats.skin);
  head.position.y = 1.42;
  head.castShadow = true;
  npc.add(head);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 12), mats.wood);
  hat.position.y = 1.6;
  npc.add(hat);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), robeMaterial);
  leftArm.position.set(-0.36, 1.0, 0);
  npc.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.36;
  npc.add(rightArm);

  npc.scale.setScalar(1.6);
  npc.userData = { fromX, toX, z, speed, phase, direction: 1, arms: [leftArm, rightArm] };
  return npc;
}

/**
 * 展厅门外的一条长安风格小街：
 * 夯土路面、两排木构店铺、檐下灯笼、尽头一座城门，
 * 街上还有三个独立行走的行人（不与场景合并，各自沿街往返）。
 */
export function createStreet() {
  const group = new THREE.Group();
  group.name = 'ChangAnStreet';
  const mats = buildMaterials();

  const length = STREET.endX - STREET.startX;
  const centerX = (STREET.startX + STREET.endX) / 2;

  const earth = new THREE.Mesh(new THREE.PlaneGeometry(length + 4, STREET.halfWidth * 2), mats.earth);
  earth.rotation.x = -Math.PI / 2;
  earth.position.set(centerX, 0.005, 0);
  earth.receiveShadow = true;
  group.add(earth);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(length + 2, 7.6), mats.road);
  road.rotation.x = -Math.PI / 2;
  road.position.set(centerX, 0.02, 0);
  road.receiveShadow = true;
  group.add(road);

  // 内排：程序化店铺（临街、低矮）

  // 生成式建筑：酒楼、客栈、阁楼、门楼
  const innSlots = [];
  [25, 33, 41].forEach((x) => {
    innSlots.push({ x, z: 12.5, rotationY: Math.PI });
    innSlots.push({ x, z: -12.5, rotationY: 0 });
  });
  loadLandmarkRow(group, '/models/street-inn.glb', innSlots, 9.5);
  loadLandmark(group, '/models/street-pavilion.glb', { x: 33, z: 18.5, height: 10, rotationY: Math.PI });
  loadLandmark(group, '/models/street-gate.glb', { x: 45.5, z: 0, height: 12, rotationY: Math.PI / 2 });

  // 街边摊位与陈设：用已生成的道具模型，避免整条街只有房子
  const stall = (x, z, flip) => {
    box(group, mats.wood, [2.6, 0.12, 1.3], [x, 0.95, z]);
    box(group, mats.wood, [0.14, 0.95, 0.14], [x - 1.15, 0.47, z - 0.5]);
    box(group, mats.wood, [0.14, 0.95, 0.14], [x + 1.15, 0.47, z - 0.5]);
    box(group, mats.wood, [0.14, 0.95, 0.14], [x - 1.15, 0.47, z + 0.5]);
    box(group, mats.wood, [0.14, 0.95, 0.14], [x + 1.15, 0.47, z + 0.5]);
    // 酒旗
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 8), mats.wood);
    pole.position.set(x + 1.5 * flip, 2.1, z - 0.6);
    group.add(pole);
    box(group, mats.cloth, [1.0, 2.2, 0.05], [x + 1.5 * flip, 3.0, z - 0.6]);
  };

  stall(24.5, 4.2, 1);
  stall(29.5, -3.8, -1);
  stall(34.5, 4.0, 1);
  stall(39.5, -3.6, -1);
  stall(43.5, 3.8, 1);

  loadLandmark(group, '/models/story-drunk.glb', { x: 24.5, y: 1.02, z: 4.2, height: 0.8, rotationY: 0.6 });
  loadLandmark(group, '/models/story-green.glb', { x: 29.5, y: 1.02, z: -3.8, height: 0.75, rotationY: -0.4 });
  loadLandmark(group, '/models/drum.glb', { x: 34.5, y: 1.02, z: 4.0, height: 0.95, rotationY: 0.8 });
  loadLandmark(group, '/models/censer.glb', { x: 39.5, y: 1.02, z: -3.6, height: 1.15, rotationY: 0 });
  loadLandmark(group, '/models/lantern.glb', { x: 43.5, y: 1.02, z: 3.8, height: 1.7, rotationY: 0 });

  // 街尽头城门
  box(group, mats.wall, [1.8, 12.5, 52], [STREET.gateX, 6.25, 0]);
  box(group, mats.roof, [3.8, 0.8, 52.6], [STREET.gateX, 12.9, 0]);
  const gateHole = new THREE.Mesh(new THREE.BoxGeometry(2.0, 8.0, 7.2), mats.wood);
  gateHole.position.set(STREET.gateX - 0.05, 4.0, 0);
  group.add(gateHole);

  // 街灯
  [24, 30, 36].forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8), mats.wood);
    pole.position.set(x, 2.7, -8.4);
    group.add(pole);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mats.lantern);
    glow.position.set(x, 5.4, -8.4);
    group.add(glow);
  });

  // 街市在展厅之外，主场景的灯照不到，补一盏天光 + 日光
  const sun = new THREE.DirectionalLight(0xffe0b0, 4.2);
  sun.position.set(28, 34, 18);
  sun.target.position.set(34, 0, 0);
  group.add(sun);
  group.add(sun.target);
  const sky = new THREE.HemisphereLight(0xd8a878, 0x4a2a1a, 2.6);
  group.add(new THREE.AmbientLight(0xffd9b0, 0.55));
  group.add(sky);

  const lightA = new THREE.PointLight(0xffb877, 42, 16, 2);
  lightA.position.set(27, 3.6, 0);
  group.add(lightA);
  const lightB = new THREE.PointLight(0xffb877, 42, 16, 2);
  lightB.position.set(35, 3.6, 0);
  group.add(lightB);

  // 两侧补光，照亮临街立面（否则 12 米外的建筑会黑成一片）
  [[24, 8], [24, -8], [31, 8], [31, -8], [38, 8], [38, -8], [44, 0]].forEach(([x, z]) => {
    const fill = new THREE.PointLight(0xffb877, 90, 30, 2);
    fill.position.set(x, 5.0, z);
    group.add(fill);
  });

  const npcs = [
    createNpc(mats, { fromX: 23.5, toX: 36.5, z: -5.6, speed: 1.05, phase: 0.2, color: 0x7a3b2a }),
    createNpc(mats, { fromX: 25.0, toX: 37.0, z: 5.9, speed: 0.85, phase: 2.1, color: 0x314a52 }),
    createNpc(mats, { fromX: 28.0, toX: 38.0, z: 7.2, speed: 1.25, phase: 4.0, color: 0x6a5a34 })
  ];
  npcs.forEach((npc) => group.add(npc));

  const colliders = [
    { type: 'box', minX: 20.0, maxX: 47.0, minZ: 8.5, maxZ: 15.0 },
    { type: 'box', minX: 20.0, maxX: 47.0, minZ: -15.0, maxZ: -8.5 },
    { type: 'box', minX: 46.2, maxX: 48.2, minZ: -26, maxZ: 26 }
  ];

  return {
    group,
    colliders,
    npcs,
    update(elapsed, delta) {
      npcs.forEach((npc) => {
        const data = npc.userData;
        npc.position.x += data.speed * data.direction * delta;
        if (npc.position.x > data.toX) {
          npc.position.x = data.toX;
          data.direction = -1;
        } else if (npc.position.x < data.fromX) {
          npc.position.x = data.fromX;
          data.direction = 1;
        }
        npc.position.y = Math.abs(Math.sin(elapsed * data.speed * 4 + data.phase)) * 0.06;
        npc.rotation.y = data.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        const swing = Math.sin(elapsed * data.speed * 6 + data.phase) * 0.35;
        data.arms[0].rotation.x = swing;
        data.arms[1].rotation.x = -swing;
      });
    }
  };
}
