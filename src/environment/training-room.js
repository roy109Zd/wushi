import * as THREE from 'three';
import { TRAINING_CHAPTERS } from '../training.js';

function buildProp(id, mats) {
  const group = new THREE.Group();

  if (id === 'stance') {
    [-0.55, 0.55].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.75, 10), mats.wood);
      post.position.set(x, 0.37, 0);
      post.castShadow = true;
      group.add(post);
    });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 10), mats.woodEdge);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 0.78;
    group.add(bar);
  } else if (id === 'stone') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.34), mats.stone);
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 20, Math.PI), mats.stone);
    handle.position.y = 0.44;
    handle.rotation.x = Math.PI / 2;
    group.add(handle);
  } else if (id === 'poles') {
    [1.1, 1.6, 2.1].forEach((height, index) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, height, 10), mats.wood);
      pole.position.set((index - 1) * 0.5, height / 2, 0);
      pole.castShadow = true;
      group.add(pole);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), mats.woodEdge);
      cap.position.set((index - 1) * 0.5, height + 0.03, 0);
      group.add(cap);
    });
  } else {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 8), mats.wood);
    stand.position.y = 0.25;
    group.add(stand);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 20), mats.cinnabar);
    drum.rotation.x = Math.PI / 2;
    drum.position.y = 0.78;
    drum.castShadow = true;
    group.add(drum);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 28), mats.brass);
    rim.position.y = 0.78;
    rim.rotation.y = Math.PI / 2;
    group.add(rim);
    [-0.18, 0.18].forEach((x) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.55, 8), mats.woodEdge);
      stick.position.set(x, 0.95, 0.32);
      stick.rotation.x = 0.9;
      group.add(stick);
    });
  }

  return group;
}

/**
 * 练功房：右侧展室里的四件训练器械，讲舞狮台下的功夫。
 */
export function createTrainingRoom() {
  const group = new THREE.Group();
  group.name = 'TrainingRoom';

  const mats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x6a4026, roughness: 0.62, metalness: 0.08 }),
    woodEdge: new THREE.MeshStandardMaterial({ color: 0x8a5530, roughness: 0.5, metalness: 0.1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x6e6459, roughness: 0.8, metalness: 0.05 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb0834a, roughness: 0.3, metalness: 0.8 }),
    cinnabar: new THREE.MeshStandardMaterial({ color: 0xa8342a, roughness: 0.45, metalness: 0.08, emissive: 0x3a0d08, emissiveIntensity: 0.4 })
  };

  const stations = [];

  TRAINING_CHAPTERS.forEach((chapter) => {
    const station = new THREE.Group();
    station.position.set(chapter.position[0], 0, chapter.position[2]);

    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.08, 24), mats.wood);
    mat.position.y = 0.04;
    mat.receiveShadow = true;
    station.add(mat);

    const prop = buildProp(chapter.id, mats);
    station.add(prop);

    group.add(station);
    stations.push({ object: station, chapter });
  });

  return { group, stations };
}
