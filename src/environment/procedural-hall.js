import * as THREE from 'three';
import { disposeObject } from '../utils.js';
import { createCenserOrnament } from './censer-ornament.js';
import { createDragonOrnament } from './dragon-ornament.js';
import { createDrumOrnament } from './drum-ornament.js';
import { createLanternPair } from './lantern-pair.js';
import { createStreet } from './street.js';
import { createStoryGallery } from './story-gallery.js';
import { createTrainingRoom } from './training-room.js';

const HALL = {
  width: 38,
  depth: 42,
  wallHeight: 10,
  stageTop: 0.88
};

function addBox(parent, material, size, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({
      color: 0x180c0a,
      roughness: 0.72,
      metalness: 0.16
    }),
    floorInlay: new THREE.MeshStandardMaterial({
      color: 0x8b633e,
      roughness: 0.34,
      metalness: 0.62,
      emissive: 0x26140a,
      emissiveIntensity: 0.45
    }),
    floorRing: new THREE.MeshStandardMaterial({
      color: 0x2e1712,
      roughness: 0.56,
      metalness: 0.28
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x4a2720,
      roughness: 0.76,
      metalness: 0.05,
      emissive: 0x3a1a0e,
      emissiveIntensity: 0.75
    }),
    wallInset: new THREE.MeshStandardMaterial({
      color: 0x5a2b1f,
      roughness: 0.7,
      metalness: 0.07,
      emissive: 0x30150c,
      emissiveIntensity: 0.55
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x31130d,
      roughness: 0.48,
      metalness: 0.24
    }),
    woodEdge: new THREE.MeshStandardMaterial({
      color: 0x5b2b18,
      roughness: 0.38,
      metalness: 0.28
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0x8f6032,
      roughness: 0.25,
      metalness: 0.88,
      emissive: 0x321807,
      emissiveIntensity: 0.45
    }),
    brassBright: new THREE.MeshStandardMaterial({
      color: 0xc69752,
      roughness: 0.22,
      metalness: 0.9,
      emissive: 0x4b280d,
      emissiveIntensity: 0.65
    }),
    stone: new THREE.MeshStandardMaterial({
      color: 0x211714,
      roughness: 0.58,
      metalness: 0.08
    }),
    lacquer: new THREE.MeshStandardMaterial({
      color: 0x5c1713,
      roughness: 0.34,
      metalness: 0.18,
      emissive: 0x280604,
      emissiveIntensity: 0.45
    }),
    lantern: new THREE.MeshStandardMaterial({
      color: 0x9e261b,
      roughness: 0.48,
      metalness: 0.06,
      emissive: 0x5e120b,
      emissiveIntensity: 1.15
    }),
    paper: new THREE.MeshStandardMaterial({
      color: 0xe4c69a,
      roughness: 0.75,
      metalness: 0.02,
      emissive: 0x4d3118,
      emissiveIntensity: 0.22,
      side: THREE.DoubleSide
    })
  };
}

function createFloor(group, mats) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width + 6, HALL.depth + 5),
    mats.floor
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -1.2;
  floor.receiveShadow = true;
  group.add(floor);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xb0834f,
    transparent: true,
    opacity: 0.1
  });
  const points = [];
  for (let x = -19; x <= 19; x += 2) {
    points.push(new THREE.Vector3(x, 0.012, -23), new THREE.Vector3(x, 0.012, 20));
  }
  for (let z = -23; z <= 20; z += 2) {
    points.push(new THREE.Vector3(-22, 0.012, z), new THREE.Vector3(22, 0.012, z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  group.add(new THREE.LineSegments(geometry, lineMaterial));

  const rings = [
    [3.7, 3.78],
    [5.35, 5.43],
    [7.55, 7.63]
  ];
  rings.forEach(([inner, outer], index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 128),
      index === 1 ? mats.floorInlay : mats.floorRing
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.018 + index * 0.002, 0);
    ring.receiveShadow = true;
    group.add(ring);
  });

  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const spoke = addBox(
      group,
      mats.floorRing,
      [0.055, 0.014, 1.9],
      [Math.sin(angle) * 6.45, 0.025, Math.cos(angle) * 6.45],
      [0, angle, 0]
    );
    spoke.castShadow = false;
  }

  const corridor = new THREE.Mesh(
    new THREE.RingGeometry(8.55, 9.45, 128, 1, Math.PI * 0.08, Math.PI * 1.84),
    mats.stone
  );
  corridor.rotation.x = -Math.PI / 2;
  corridor.position.y = 0.022;
  corridor.receiveShadow = true;
  group.add(corridor);
}

function createStage(group, mats) {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.18, 3.32, 0.18, 96),
    mats.stone
  );
  base.position.y = 0.09;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const second = new THREE.Mesh(
    new THREE.CylinderGeometry(2.78, 3.02, 0.3, 96),
    mats.wallInset
  );
  second.position.y = 0.33;
  second.castShadow = true;
  second.receiveShadow = true;
  group.add(second);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.58, 0.34, 96),
    mats.wood
  );
  top.position.y = 0.65;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(2.33, 2.33, 0.08, 96),
    mats.stone
  );
  topCap.position.y = 0.84;
  topCap.receiveShadow = true;
  group.add(topCap);

  [0.83, 0.5, 0.18].forEach((y, index) => {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(index === 0 ? 2.35 : 2.6 + index * 0.24, 0.025, 10, 128),
      index === 0 ? mats.brassBright : mats.brass
    );
    torus.rotation.x = Math.PI / 2;
    torus.position.y = y;
    group.add(torus);
  });

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(2.24, 96),
    new THREE.MeshBasicMaterial({
      color: 0x4b2417,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.886;
  group.add(halo);
}

function createMoonGate(group, mats, position = [0, 4.05, -11.35]) {
  const gate = new THREE.Group();
  gate.position.set(...position);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.58, 0.19, 14, 128),
    mats.woodEdge
  );
  outerRing.castShadow = true;
  gate.add(outerRing);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.33, 0.045, 10, 128),
    mats.brassBright
  );
  innerRing.position.z = 0.08;
  gate.add(innerRing);

  const inset = new THREE.Mesh(
    new THREE.CircleGeometry(3.27, 96),
    new THREE.MeshStandardMaterial({
      color: 0x140807,
      roughness: 0.8,
      metalness: 0.05,
      emissive: 0x160705,
      emissiveIntensity: 0.5
    })
  );
  inset.position.z = -0.18;
  gate.add(inset);

  const frameHeight = 7.25;
  addBox(gate, mats.wood, [0.42, frameHeight, 0.55], [-3.58, -2.4, 0]);
  addBox(gate, mats.wood, [0.42, frameHeight, 0.55], [3.58, -2.4, 0]);
  addBox(gate, mats.wood, [7.58, 0.34, 0.6], [0, 1.2, 0]);
  addBox(gate, mats.brass, [0.08, frameHeight - 0.4, 0.64], [-3.58, -2.4, 0]);
  addBox(gate, mats.brass, [0.08, frameHeight - 0.4, 0.64], [3.58, -2.4, 0]);
  group.add(gate);
}

function createLatticePanel(width = 4.7, height = 4.8) {
  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({
    color: 0x4e2214,
    roughness: 0.44,
    metalness: 0.24
  });
  const slat = new THREE.MeshStandardMaterial({
    color: 0x7c4a28,
    roughness: 0.38,
    metalness: 0.34
  });

  addBox(group, frame, [width + 0.22, 0.16, 0.22], [0, height / 2, 0]);
  addBox(group, frame, [width + 0.22, 0.16, 0.22], [0, -height / 2, 0]);
  addBox(group, frame, [0.16, height + 0.22, 0.22], [-width / 2, 0, 0]);
  addBox(group, frame, [0.16, height + 0.22, 0.22], [width / 2, 0, 0]);

  const columns = 11;
  for (let i = 0; i < columns; i += 1) {
    const x = -width / 2 + (i / (columns - 1)) * width;
    addBox(group, slat, [0.035, height, 0.075], [x, 0, 0]);
  }
  for (let i = 1; i < 8; i += 1) {
    const y = -height / 2 + (i / 8) * height;
    addBox(group, slat, [width, 0.03, 0.075], [0, y, 0]);
  }

  const medallion = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.55, 4),
    frame
  );
  medallion.rotation.z = Math.PI / 4;
  medallion.position.z = 0.06;
  group.add(medallion);

  return group;
}

function createColumn(mats) {
  const column = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.32, 12), mats.stone);
  base.position.y = 0.16;
  column.add(base);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.53, 6.6, 20), mats.lacquer);
  shaft.position.y = 3.6;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  column.add(shaft);

  [0.52, 6.62].forEach((y) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.045, 8, 28), mats.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    column.add(ring);
  });

  const capital = addBox(column, mats.woodEdge, [1.45, 0.22, 1.45], [0, 7.02, 0]);
  capital.castShadow = true;
  addBox(column, mats.wood, [1.7, 0.2, 1.7], [0, 7.18, 0]);

  return column;
}

function createLantern(mats, withLight) {
  const lantern = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18), mats.lantern);
  body.scale.y = 1.28;
  body.castShadow = true;
  lantern.add(body);

  [-0.48, 0.48].forEach((y) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.1, 20), mats.brass);
    cap.position.y = y;
    lantern.add(cap);
  });

  for (let i = 0; i < 6; i += 1) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.425, 0.008, 5, 32, Math.PI),
      mats.brassBright
    );
    rib.rotation.y = (i / 6) * Math.PI;
    rib.rotation.z = Math.PI / 2;
    rib.scale.y = 1.24;
    lantern.add(rib);
  }

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.1, 6), mats.brass);
  cord.position.y = 1.52;
  lantern.add(cord);

  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.75, 12), mats.lacquer);
  tassel.position.y = -0.96;
  tassel.rotation.z = Math.PI;
  lantern.add(tassel);

  if (withLight) {
    const light = new THREE.PointLight(0xff8d4c, 28, 6.5, 2);
    light.position.y = -0.15;
    lantern.add(light);
  }

  return lantern;
}

function createCloudOrnament(scale = 1) {
  const cloud = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xb9874e,
    roughness: 0.31,
    metalness: 0.72,
    emissive: 0x35200c,
    emissiveIntensity: 0.56
  });

  const arcs = [
    { p: [-0.76, 0, 0], r: 0.45, rot: -0.45 },
    { p: [-0.18, 0.12, 0], r: 0.6, rot: 0.1 },
    { p: [0.48, 0.05, 0], r: 0.44, rot: 0.58 },
    { p: [0.95, -0.12, 0], r: 0.26, rot: 1.1 }
  ];

  arcs.forEach(({ p, r, rot }) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.035, 8, 38, Math.PI * 1.45),
      gold
    );
    arc.position.set(...p);
    arc.rotation.z = rot;
    cloud.add(arc);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), gold);
    bead.position.set(p[0] + r, p[1] + r * 0.28, 0.02);
    cloud.add(bead);
  });

  cloud.scale.setScalar(scale);
  return cloud;
}

function createTextPanel(position = [0, 6.18, -13.55]) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(186, 139, 80, 0.72)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 156px "Songti SC", "STSong", serif';
  context.fillText('东方醒狮', canvas.width / 2, 110);
  context.font = '400 34px Georgia, serif';
  context.letterSpacing = '12px';
  context.fillText('ORIENTAL LION · MATERIAL SPIRIT', canvas.width / 2, 232);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.67), material);
  mesh.position.set(...position);
  return mesh;
}

function createDust(mats) {
  const count = 220;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 4 + Math.random() * 13;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.3 + Math.random() * 8.5;
    positions[i * 3 + 2] = Math.sin(angle) * radius - 1.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf3c67e,
    size: 0.026,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  return points;
}

function createNiche(mats, x) {
  const niche = new THREE.Group();
  niche.position.set(x, 0, -18.5);

  const back = addBox(niche, mats.wallInset, [3.1, 4.6, 0.16], [0, 2.6, 0]);
  back.receiveShadow = true;

  addBox(niche, mats.woodEdge, [3.4, 0.2, 0.5], [0, 4.95, 0.16]);
  addBox(niche, mats.woodEdge, [0.2, 4.9, 0.5], [-1.6, 2.5, 0.16]);
  addBox(niche, mats.woodEdge, [0.2, 4.9, 0.5], [1.6, 2.5, 0.16]);
  addBox(niche, mats.brass, [3.0, 0.06, 0.1], [0, 4.78, 0.35]);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.72, 1.05, 24),
    mats.stone
  );
  pedestal.position.set(0, 0.52, 0.35);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  niche.add(pedestal);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.03, 8, 40), mats.brassBright);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 1.05, 0.35);
  niche.add(ring);

  const artifactMaterial = new THREE.MeshStandardMaterial({
    color: 0xc98a4a,
    roughness: 0.32,
    metalness: 0.55,
    emissive: 0x7a3d12,
    emissiveIntensity: 0.55
  });
  const artifact = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), artifactMaterial);
  artifact.position.set(0, 1.58, 0.35);
  artifact.rotation.set(0.35, 0.6, 0.2);
  artifact.castShadow = true;
  niche.add(artifact);

  const light = new THREE.PointLight(0xffb070, 16, 7, 2);
  light.position.set(0, 3.9, 1.0);
  niche.add(light);

  return { group: niche, artifact };
}

/**
 * 檐口暗藏灯带：用不受光照影响的 Basic 材质模拟 LED 洗墙，
 * 比再加一堆实时光源便宜，但能明显提亮墙面。
 */
function createCoveLights(root) {
  const material = new THREE.MeshBasicMaterial({ color: 0xb9834e });
  const dimMaterial = new THREE.MeshBasicMaterial({ color: 0x7d5230 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(36, 0.05, 0.08), material);
  back.position.set(0, 7.9, -19.0);
  root.add(back);

  [-20.0, 20.0].forEach((x) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 40), dimMaterial);
    strip.position.set(x, 7.9, -1.5);
    root.add(strip);
  });

  const floorLine = new THREE.Mesh(new THREE.BoxGeometry(36, 0.03, 0.05), dimMaterial);
  floorLine.position.set(0, 0.06, -18.9);
  root.add(floorLine);
}

function createFoldingScreen(mats, width = 4.6, height = 3.2, panels = 5) {
  const group = new THREE.Group();
  const panelWidth = width / panels;

  for (let i = 0; i < panels; i += 1) {
    const panel = new THREE.Group();
    const x = (i - (panels - 1) / 2) * panelWidth;
    panel.position.set(x, 0, (i % 2 === 0 ? -1 : 1) * 0.24);
    panel.rotation.y = (i % 2 === 0 ? -1 : 1) * 0.12;

    const paper = addBox(panel, mats.paper, [panelWidth - 0.08, height - 0.16, 0.05], [0, height / 2, 0]);
    paper.receiveShadow = true;

    addBox(panel, mats.woodEdge, [panelWidth, 0.12, 0.12], [0, height - 0.04, 0]);
    addBox(panel, mats.woodEdge, [panelWidth, 0.12, 0.12], [0, 0.06, 0]);
    addBox(panel, mats.woodEdge, [0.09, height, 0.12], [-panelWidth / 2 + 0.04, height / 2, 0]);
    addBox(panel, mats.woodEdge, [0.09, height, 0.12], [panelWidth / 2 - 0.04, height / 2, 0]);

    group.add(panel);
  }

  return group;
}

/** 三面墙的洗墙光，补足墙面亮度，不投影。 */
function createWallWash() {
  const lights = [
    { position: [0, 7.4, -16.5], intensity: 55 },
    { position: [-17.4, 6.6, -2], intensity: 40 },
    { position: [17.4, 6.6, -2], intensity: 40 }
  ];

  return lights.map(({ position, intensity }) => {
    const light = new THREE.PointLight(0xffc89a, intensity, 26, 2);
    light.position.set(...position);
    light.castShadow = false;
    return light;
  });
}

/**
 * 后部两侧的小房间：一道纵向隔墙 + 一道带门洞的横墙，
 * 把后区隔成两个可以从正面走进去的展室，壁龛正好成为端景。
 */
function createSideRoom(mats, side) {
  const group = new THREE.Group();
  const wallX = side * 9.0;
  const frontZ = -8.6;
  const height = 4.6;
  const innerX = side * 15.2;
  const doorHalf = 1.1;

  // 纵向隔墙
  addBox(group, mats.wall, [0.28, height, 9.8], [wallX, height / 2, -13.5]);

  // 横向墙：门洞居中在壁龛轴线上
  const doorCenter = side * 11.9;
  const leftWidth = Math.abs(doorCenter - doorHalf - side * 8.9);
  const rightWidth = Math.abs(innerX - (doorCenter + doorHalf));

  addBox(
    group,
    mats.wall,
    [leftWidth, height, 0.28],
    [side * (8.9 + leftWidth / 2), height / 2, frontZ]
  );
  addBox(
    group,
    mats.wall,
    [rightWidth, height, 0.28],
    [side * (doorCenter + doorHalf + rightWidth / 2), height / 2, frontZ]
  );

  // 门楣与门框
  addBox(group, mats.wall, [doorHalf * 2, height - 3.3, 0.3], [doorCenter, (height + 3.3) / 2, frontZ]);
  addBox(group, mats.woodEdge, [0.16, 3.3, 0.42], [doorCenter - doorHalf, 1.65, frontZ]);
  addBox(group, mats.woodEdge, [0.16, 3.3, 0.42], [doorCenter + doorHalf, 1.65, frontZ]);
  addBox(group, mats.brass, [doorHalf * 2 + 0.3, 0.08, 0.42], [doorCenter, 3.34, frontZ]);

  return {
    group,
    colliders: [
      { type: 'box', minX: wallX - 0.18, maxX: wallX + 0.18, minZ: -18.4, maxZ: frontZ },
      { type: 'box', minX: side * 8.9, maxX: doorCenter - doorHalf, minZ: frontZ - 0.2, maxZ: frontZ + 0.2 },
      { type: 'box', minX: doorCenter + doorHalf, maxX: innerX, minZ: frontZ - 0.2, maxZ: frontZ + 0.2 }
    ]
  };
}

function createDoorSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(242, 208, 154, 0.95)';
  ctx.font = '600 86px "Songti SC", "STSong", serif';
  ctx.fillText('街 市', 256, 66);
  ctx.fillStyle = 'rgba(242, 208, 154, 0.6)';
  ctx.font = '400 26px Georgia, serif';
  ctx.fillText('M A R K E T   →', 256, 138);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.92), material);
  mesh.position.set(19.86, 4.55, 0);
  mesh.rotation.y = -Math.PI / 2;
  return mesh;
}

export function createProceduralHall() {
  const root = new THREE.Group();
  root.name = 'ProceduralOrientalHall';
  const mats = createMaterials();

  createFloor(root, mats);
  createStage(root, mats);

  const wallThickness = 0.5;
  addBox(root, mats.wall, [HALL.width, HALL.wallHeight, wallThickness], [0, HALL.wallHeight / 2, -19.2]);
  addBox(root, mats.wall, [wallThickness, HALL.wallHeight, HALL.depth + 6], [-20.2, HALL.wallHeight / 2, -1]);
  // 右墙留出门洞，通往街市
  addBox(root, mats.wall, [wallThickness, HALL.wallHeight, 23.4], [20.2, HALL.wallHeight / 2, -13.3]);
  addBox(root, mats.wall, [wallThickness, HALL.wallHeight, 21.4], [20.2, HALL.wallHeight / 2, 12.3]);
  addBox(root, mats.wall, [wallThickness, HALL.wallHeight - 3.9, 3.2], [20.2, (HALL.wallHeight + 3.9) / 2, 0]);
  addBox(root, mats.woodEdge, [0.62, 3.9, 0.26], [20.2, 1.95, -1.6]);
  addBox(root, mats.woodEdge, [0.62, 3.9, 0.26], [20.2, 1.95, 1.6]);
  addBox(root, mats.brass, [0.66, 0.1, 3.5], [20.2, 3.94, 0]);

  // 门洞引导：红毯 + 门匾 + 一对门灯，避免玩家找不到出口
  const carpet = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.03, 1.5),
    new THREE.MeshStandardMaterial({
      color: 0x6d1f18,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x2a0a06,
      emissiveIntensity: 0.5
    })
  );
  carpet.position.set(13.8, 0.02, 0);
  carpet.receiveShadow = true;
  root.add(carpet);

  root.add(createDoorSign());

  [-2.2, 2.2].forEach((z) => {
    const doorLantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), mats.lantern);
    doorLantern.scale.y = 1.2;
    doorLantern.position.set(19.7, 3.35, z);
    root.add(doorLantern);
  });

  const doorLight = new THREE.PointLight(0xffb070, 26, 10, 2);
  doorLight.position.set(18.9, 3.6, 0);
  root.add(doorLight);

  for (let x = -16; x <= 16; x += 3) {
    addBox(root, mats.woodEdge, [0.08, 8.6, 0.18], [x, 4.8, -18.86]);
  }

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width + 2, HALL.depth + 2),
    mats.wall
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 9.95, -1);
  root.add(ceiling);

  for (let z = -16.5; z <= 12.5; z += 3.8) {
    addBox(root, mats.wood, [HALL.width - 2.2, 0.26, 0.34], [0, 9.55, z]);
    addBox(root, mats.brass, [HALL.width - 2.8, 0.035, 0.42], [0, 9.39, z]);
  }

  createWallWash().forEach((light) => root.add(light));

  const pillarPositions = [
    [-10.2, 7.0],
    [10.2, 7.0],
    [-10.2, 0.6],
    [10.2, 0.6],
    [-10.2, -6.4],
    [10.2, -6.4],
    [-10.2, -13.0],
    [10.2, -13.0]
  ];

  pillarPositions.forEach(([x, z]) => {
    const column = createColumn(mats);
    column.position.set(x, 0, z);
    root.add(column);
  });

  [-13.2, -4.6, 4.2].forEach((x) => {
    [-3.4, -7.1].forEach((z) => {
      if (x > 0 && z < -4) return;
      const banner = addBox(
        root,
        mats.wallInset,
        [0.72, 4.3, 0.07],
        [x, 3.45, z],
        [0, 0.08, 0]
      );
      banner.castShadow = false;
      const trim = addBox(
        root,
        mats.brass,
        [0.76, 0.04, 0.08],
        [x, 1.3, z + 0.02],
        [0, 0.08, 0]
      );
      trim.castShadow = false;
    });
  });

  const leftScreen = createLatticePanel(5.6, 6.2);
  leftScreen.position.set(-15.2, 4.0, -4.8);
  leftScreen.rotation.y = Math.PI / 2;
  root.add(leftScreen);

  const rightScreen = createLatticePanel(5.6, 6.2);
  rightScreen.position.set(15.2, 4.0, -4.8);
  rightScreen.rotation.y = -Math.PI / 2;
  root.add(rightScreen);

  createMoonGate(root, mats, [0, 4.6, -16.35]);
  root.add(createTextPanel([0, 7.6, -18.55]));

  const cloudLeft = createCloudOrnament(1.15);
  cloudLeft.position.set(-5.8, 7.3, -15.85);
  root.add(cloudLeft);
  const cloudRight = createCloudOrnament(1.15);
  cloudRight.scale.x *= -1;
  cloudRight.position.set(5.8, 7.3, -15.85);
  root.add(cloudRight);

  const lanternPositions = [
    [-7.2, 6.1, -6.5, true],
    [7.2, 6.1, -6.5, true],
    [-13.4, 5.8, 3.2, false],
    [13.4, 5.8, 3.2, false]
  ];

  lanternPositions.forEach(([x, y, z, withLight], index) => {
    const lantern = createLantern(mats, withLight);
    lantern.position.set(x, y, z);
    lantern.rotation.y = index * 0.55;
    root.add(lantern);
  });

  const titleGrill = createLatticePanel(9.6, 1.5);
  titleGrill.position.set(0, 8.9, -18.45);
  titleGrill.scale.y = 0.65;
  root.add(titleGrill);

  const dust = createDust(mats);
  root.add(dust);

  const dragon = createDragonOrnament();
  root.add(dragon.group);

  const drum = createDrumOrnament();
  root.add(drum.group);

  const censer = createCenserOrnament();
  root.add(censer.group);

  const lanterns = createLanternPair();
  root.add(lanterns.group);

  createCoveLights(root);

  const nicheWest = createNiche(mats, -11.8);
  root.add(nicheWest.group);
  const nicheEast = createNiche(mats, 11.8);
  root.add(nicheEast.group);

  const storyGallery = createStoryGallery();
  root.add(storyGallery.group);

  const trainingRoom = createTrainingRoom();
  root.add(trainingRoom.group);

  const screenRight = createFoldingScreen(mats, 4.4, 3.0, 5);
  screenRight.position.set(14.6, 0, 5.2);
  screenRight.rotation.y = -1.35;
  root.add(screenRight);

  const roomLeft = createSideRoom(mats, -1);
  root.add(roomLeft.group);
  const roomRight = createSideRoom(mats, 1);
  root.add(roomRight.group);

  const street = createStreet();
  root.add(street.group);

  // 可点击的空间展品：点击后弹出说明卡
  const interactives = [
    {
      object: drum.group,
      kicker: 'PROP · 醒狮鼓',
      title: '鼓点就是狮子的呼吸',
      body: '南狮的每一个动作都由鼓点指挥：起势、探路、采青、收势，鼓师用节奏控制狮头的轻重。展厅里这面鼓是 AI 生成的，摆在展台左前方，和右侧香炉一起把中央让出来。',
      focus: { target: [-4.25, 1.1, 1.55], camera: [-2.3, 2.1, 5.4] }
    },
    {
      object: censer.group,
      kicker: 'PROP · 铜香炉',
      title: '三足鼎式的仪式感',
      body: '鼎式香炉在传统厅堂里承担「礼」的部分：它比人高、比灯重，放在入口一侧，用体量告诉观众这里不是普通房间。这里的高度按 2.2 单位处理，约主角的三分之二。',
      focus: { target: [4.35, 1.4, 1.5], camera: [2.5, 2.2, 5.5] }
    },
    {
      object: dragon.group,
      kicker: 'PROP · 背景盘龙',
      title: '巡游的龙',
      body: '龙沿展厅上空缓慢盘旋，半径避开柱子，所以永远不会撞到结构。它没有骨骼，只有自转与呼吸般的起伏——但足够让静态的空间一直「在动」。'
    },
    {
      object: lanterns.group,
      kicker: 'PROP · 宫灯',
      title: '一对宫灯撑起纵深',
      body: '两盏宫灯一左一右立在展台两侧，是空间里最高的摆件。它们的任务不是照明，而是给画面加两条竖向的边，让观众一眼读出展厅的高度。',
      focus: { target: [7.7, 2.4, -1.1], camera: [4.8, 2.8, 3.6] }
    },
    {
      object: nicheWest.group,
      kicker: 'NICHE 01 · 西龛',
      title: '壁龛里的材质砖',
      body: '两侧墙上的壁龛是这一版新加的展区：一个抬高的石台、一枚缓慢呼吸的材质砖。砖块的金属度与自发光，正好对应展厅里「材质实验室」那条线索。',
      focus: { target: [-11.8, 2.3, -18.4], camera: [-8.4, 2.8, -13.4] }
    },
    {
      object: nicheEast.group,
      kicker: 'NICHE 02 · 东龛',
      title: '对称的第二枚材质砖',
      body: '东龛与西龛严格对称，位置在月亮门两侧。它们的作用是把视觉重心从中央展台向两边拉开，让 38×42 的展厅不至于显得空。',
      focus: { target: [11.8, 2.3, -18.4], camera: [8.4, 2.8, -13.4] }
    },
    {
      object: screenRight,
      kicker: 'SCREEN · 折屏',
      title: '把空间分成前后两进',
      body: '五折屏风斜放在展厅右前侧，把「入口—展台」这条直线轻轻挡了一下。观众得绕半步才能看到主角，这一绕就是传统空间里的「抑」——先收，再放。',
      focus: { target: [14.6, 1.8, 5.2], camera: [10.8, 2.6, 8.6] }
    },
    ...storyGallery.stations.map(({ object, chapter }) => ({
      object,
      kicker: chapter.kicker,
      title: chapter.title,
      body: chapter.body,
      focus: chapter.focus
    })),
    ...trainingRoom.stations.map(({ object, chapter }) => ({
      object,
      kicker: chapter.kicker,
      title: chapter.title,
      body: chapter.body,
      focus: chapter.focus
    }))
  ];

  const colliders = [
    { type: 'circle', x: 0, z: 0, radius: 3.45 },
    ...pillarPositions.map(([x, z]) => ({ type: 'circle', x, z, radius: 0.86 })),
    { type: 'circle', x: -3.58, z: -16.35, radius: 0.62 },
    { type: 'circle', x: 3.58, z: -16.35, radius: 0.62 },
    { type: 'circle', x: -4.25, z: 1.55, radius: 0.9 },
    { type: 'circle', x: 4.35, z: 1.5, radius: 1.05 },
    { type: 'circle', x: -7.7, z: -1.1, radius: 0.95 },
    { type: 'circle', x: 7.7, z: -1.1, radius: 0.95 },
    { type: 'circle', x: 14.6, z: 5.2, radius: 1.8 },
    ...storyGallery.stations.map(({ chapter }) => ({
      type: 'circle',
      x: chapter.position[0],
      z: chapter.position[2],
      radius: 0.85
    })),
    ...trainingRoom.stations.map(({ chapter }) => ({
      type: 'circle',
      x: chapter.position[0],
      z: chapter.position[2],
      radius: 0.95
    })),
    ...roomLeft.colliders,
    ...roomRight.colliders,
    { type: 'box', minX: 20.0, maxX: 20.4, minZ: -25, maxZ: -1.6 },
    { type: 'box', minX: 20.0, maxX: 20.4, minZ: 1.6, maxZ: 23 },
    ...street.colliders
  ];

  return {
    group: root,
    stageTop: HALL.stageTop,
    bounds: { minX: -19.7, maxX: 39.0, minZ: -18.2, maxZ: 16.5 },
    label: '程序化东方展厅',
    source: 'procedural',
    colliders,
    interactives,
    update(elapsed, delta) {
      dust.rotation.y += delta * 0.015;
      dust.position.y = Math.sin(elapsed * 0.18) * 0.035;
      dragon.update(delta, elapsed);
      drum.update(delta, elapsed);
      censer.update(delta, elapsed);
      lanterns.update(delta, elapsed);
      street.update(elapsed, delta);
    },
    dispose() {
      dragon.dispose();
      drum.dispose();
      censer.dispose();
      lanterns.dispose();
      disposeObject(root);
      root.removeFromParent();
    }
  };
}
