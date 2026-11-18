import * as THREE from 'three';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

export function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function createRoundedBox(width, height, depth, radius = 0.04) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: Math.min(radius * 0.35, 0.025),
    bevelThickness: Math.min(radius * 0.35, 0.025),
    curveSegments: 6
  });

  geometry.center();
  return geometry;
}

export function normalizeObject(object, targetHeight) {
  object.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(object);
  const initialSize = new THREE.Vector3();
  initialBox.getSize(initialSize);

  if (!Number.isFinite(initialSize.y) || initialSize.y <= 0) {
    return { height: 0, width: 0, depth: 0 };
  }

  const scale = targetHeight / initialSize.y;
  object.scale.multiplyScalar(scale);
  object.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= scaledBox.min.y;
  object.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(object);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  return {
    width: finalSize.x,
    height: finalSize.y,
    depth: finalSize.z
  };
}

export function collectMaterials(root) {
  const materials = new Set();

  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const list = Array.isArray(child.material)
      ? child.material
      : [child.material];

    list.filter(Boolean).forEach((material) => materials.add(material));
  });

  return materials;
}

export function setObjectOpacity(root, opacity, fadeState = false) {
  const materials = collectMaterials(root);

  materials.forEach((material) => {
    material.transparent = opacity < 0.999 || fadeState;
    material.opacity = opacity;
    material.depthWrite = !fadeState || opacity > 0.92;
    material.needsUpdate = true;
  });
}

export function disposeObject(root, { disposeTextures = true } = {}) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);

    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    childMaterials.filter(Boolean).forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value);
      });
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  if (disposeTextures) textures.forEach((texture) => texture.dispose());
}

export function formatCount(value) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value));
}
