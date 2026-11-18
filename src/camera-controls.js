import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SHOWCASE, VIEW_PRESETS } from './config.js';
import { clamp } from './utils.js';

export class ViewerController {
  constructor({
    camera,
    domElement,
    colliders,
    onModeChange = () => {},
    onPointerLockChange = () => {},
    onPresetChange = () => {}
  }) {
    this.camera = camera;
    this.domElement = domElement;
    this.colliders = colliders;
    this.bounds = SHOWCASE.exploreBounds;
    this.onModeChange = onModeChange;
    this.onPointerLockChange = onPointerLockChange;
    this.onPresetChange = onPresetChange;
    this.mode = 'exhibition';
    this.activePreset = 'full';
    this.suspended = false;
    this.playerRadius = 0.32;
    this.velocity = new THREE.Vector2();
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = -0.02;
    this.savedExhibitionState = null;
    this.viewTween = null;

    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.065;
    this.orbit.enablePan = false;
    this.orbit.enableZoom = true;
    this.orbit.minDistance = 1.8;
    this.orbit.maxDistance = 22;
    this.orbit.minPolarAngle = 0.18;
    this.orbit.maxPolarAngle = Math.PI * 0.78;
    this.orbit.target.fromArray(SHOWCASE.defaultTarget);
    this.orbit.update();

    this.onOrbitStart = () => {
      if (this.activePreset) {
        this.activePreset = null;
        this.onPresetChange(null);
      }
      if (this.viewTween) {
        this.viewTween = null;
        this.orbit.enabled = true;
      }
    };
    this.orbit.addEventListener('start', this.onOrbitStart);

    this.onKeyDown = (event) => {
      if (this.mode !== 'explore') return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
      }
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onBlur = () => this.keys.clear();
    this.onMouseMove = (event) => {
      if (this.mode !== 'explore' || document.pointerLockElement !== this.domElement) return;
      const sensitivity = 0.0018;
      this.yaw -= event.movementX * sensitivity;
      this.pitch = clamp(this.pitch - event.movementY * sensitivity, -1.15, 1.15);
    };
    this.onCanvasClick = () => {
      if (this.mode === 'explore' && document.pointerLockElement !== this.domElement) {
        this.requestPointerLock();
      }
    };
    this.onPointerLockChange = () => {
      this.onPointerLockChange(Boolean(document.pointerLockElement));
    };

    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    domElement.addEventListener('click', this.onCanvasClick);
  }

  setWorldCollision({ colliders = [], bounds = SHOWCASE.exploreBounds } = {}) {
    this.colliders = colliders;
    this.bounds = bounds;
  }

  setMode(mode, { lockPointer = false } = {}) {
    if (mode === this.mode) return;

    if (mode === 'explore') {
      this.savedExhibitionState = {
        position: this.camera.position.clone(),
        quaternion: this.camera.quaternion.clone(),
        target: this.orbit.target.clone()
      };
      this.mode = 'explore';
      this.orbit.enabled = false;
      const desiredStart = SHOWCASE.exploreStart;
      this.camera.position.set(
        clamp(desiredStart[0], this.bounds.minX + 0.8, this.bounds.maxX - 0.8),
        desiredStart[1],
        clamp(desiredStart[2], this.bounds.minZ + 0.8, this.bounds.maxZ - 0.8)
      );
      this.yaw = 0;
      this.pitch = -0.015;
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.velocity.set(0, 0);
      this.keys.clear();
      this.activePreset = null;
      this.onPresetChange(null);
      this.onModeChange('explore');
      if (lockPointer) this.requestPointerLock();
      return;
    }

    this.exitExplore(!this.savedExhibitionState);
  }

  requestPointerLock() {
    if (this.mode !== 'explore') return;
    try {
      const request = this.domElement.requestPointerLock?.();
      if (request?.catch) request.catch(() => {});
    } catch (error) {
      console.warn('[Explore] 浏览器未允许锁定鼠标。', error);
    }
  }

  exitExplore(useDefault = false) {
    this.mode = 'exhibition';
    this.keys.clear();
    this.velocity.set(0, 0);
    if (document.pointerLockElement) document.exitPointerLock();

    if (!useDefault && this.savedExhibitionState) {
      const state = this.savedExhibitionState;
      this.camera.position.copy(state.position);
      this.camera.quaternion.copy(state.quaternion);
      this.orbit.target.copy(state.target);
    } else {
      this.camera.position.fromArray(SHOWCASE.defaultCamera);
      this.orbit.target.fromArray(SHOWCASE.defaultTarget);
      this.camera.lookAt(this.orbit.target);
    }

    this.orbit.enabled = true;
    this.orbit.update();
    this.activePreset = null;
    this.onPresetChange(null);
    this.onModeChange('exhibition');
  }

  resetView({ instant = false } = {}) {
    if (this.mode !== 'exhibition') {
      this.exitExplore(true);
    }

    this.activePreset = 'full';
    this.onPresetChange('full');

    if (instant) {
      this.camera.position.fromArray(SHOWCASE.defaultCamera);
      this.orbit.target.fromArray(SHOWCASE.defaultTarget);
      this.orbit.update();
      return;
    }

    this.viewTween = {
      startedAt: performance.now(),
      duration: 700,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.orbit.target.clone(),
      toPosition: new THREE.Vector3().fromArray(SHOWCASE.defaultCamera),
      toTarget: new THREE.Vector3().fromArray(SHOWCASE.defaultTarget)
    };
    this.orbit.enabled = false;
  }

  /**
   * 切换到预设机位：全景 / 狮首 / 侧身。
   * 走的是和复位视角同一套补间，用户一旦拖动就交还给 OrbitControls。
   */
  focusPreset(id, { duration = 900 } = {}) {
    const preset = VIEW_PRESETS.find((item) => item.id === id);
    if (!preset) return false;

    if (this.mode !== 'exhibition') this.exitExplore(true);

    this.activePreset = id;
    this.onPresetChange(id);
    this.viewTween = {
      startedAt: performance.now(),
      duration,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.orbit.target.clone(),
      toPosition: new THREE.Vector3().fromArray(preset.position),
      toTarget: new THREE.Vector3().fromArray(preset.target)
    };
    this.orbit.enabled = false;
    return true;
  }

  cyclePreset() {
    const index = VIEW_PRESETS.findIndex((preset) => preset.id === this.activePreset);
    const next = VIEW_PRESETS[(index + 1) % VIEW_PRESETS.length];
    this.focusPreset(next.id);
    return next;
  }

  /** 把相机补间到任意目标点，用于部位热点导览。 */
  focusOn(target, position, { duration = 900 } = {}) {
    if (this.mode !== 'exhibition') this.exitExplore(true);

    this.activePreset = null;
    this.onPresetChange(null);
    this.viewTween = {
      startedAt: performance.now(),
      duration,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.orbit.target.clone(),
      toPosition: position.clone(),
      toTarget: target.clone()
    };
    this.orbit.enabled = false;
  }

  collides(x, z, radius = this.playerRadius) {
    const { minX, maxX, minZ, maxZ } = this.bounds;
    if (
      x < minX + radius ||
      x > maxX - radius ||
      z < minZ + radius ||
      z > maxZ - radius
    ) {
      return true;
    }

    return this.colliders.some((collider) => {
      if (collider.type === 'box') {
        return (
          x > collider.minX - radius &&
          x < collider.maxX + radius &&
          z > collider.minZ - radius &&
          z < collider.maxZ + radius
        );
      }

      const dx = x - collider.x;
      const dz = z - collider.z;
      const distance = (collider.radius || 0.6) + radius;
      return dx * dx + dz * dz < distance * distance;
    });
  }

  updateExplore(delta) {
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const strafeInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const inputLength = Math.hypot(forwardInput, strafeInput);
    const moving = inputLength > 0;
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 5.2 : 3.1;

    let desiredX = 0;
    let desiredZ = 0;
    if (moving) {
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);
      desiredX = (forwardX * forwardInput + rightX * strafeInput) / inputLength;
      desiredZ = (forwardZ * forwardInput + rightZ * strafeInput) / inputLength;
    }

    const blend = 1 - Math.exp(-10 * delta);
    this.velocity.x += (desiredX * speed - this.velocity.x) * blend;
    this.velocity.y += (desiredZ * speed - this.velocity.y) * blend;

    const nextX = this.camera.position.x + this.velocity.x * delta;
    const nextZ = this.camera.position.z + this.velocity.y * delta;

    if (!this.collides(nextX, this.camera.position.z)) {
      this.camera.position.x = nextX;
    } else {
      this.velocity.x = 0;
    }
    if (!this.collides(this.camera.position.x, nextZ)) {
      this.camera.position.z = nextZ;
    } else {
      this.velocity.y = 0;
    }

    const bob = moving ? Math.sin(performance.now() * 0.009) * 0.018 : 0;
    this.camera.position.y = 1.72 + bob;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  setSuspended(suspended) {
    this.suspended = Boolean(suspended);
    if (this.suspended && document.pointerLockElement) document.exitPointerLock();
  }

  update(delta = 1 / 60) {
    if (this.suspended) return;

    if (this.mode === 'explore') {
      this.updateExplore(Math.min(delta, 0.05));
      return;
    }

    if (this.viewTween) {
      const now = performance.now();
      const progress = Math.min(1, (now - this.viewTween.startedAt) / this.viewTween.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.position.lerpVectors(
        this.viewTween.fromPosition,
        this.viewTween.toPosition,
        eased
      );
      this.orbit.target.lerpVectors(
        this.viewTween.fromTarget,
        this.viewTween.toTarget,
        eased
      );
      this.camera.lookAt(this.orbit.target);
      if (progress >= 1) {
        this.viewTween = null;
        this.orbit.enabled = true;
        this.orbit.update();
      }
      return;
    }

    this.orbit.update();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.removeEventListener('click', this.onCanvasClick);
    this.orbit.removeEventListener('start', this.onOrbitStart);
    this.orbit.dispose();
  }
}
