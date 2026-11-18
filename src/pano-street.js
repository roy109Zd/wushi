import * as THREE from 'three';

/**
 * SpatialGen 输出的等距柱状全景图查看器。
 * 3DGS 的 spz 是 v3（当前库不支持），ply 在无头环境中渲染为黑屏，
 * 因此用同一空间的全景图做保底：1.1MB、秒开、纯 CPU 也能跑。
 */
export class PanoStreet {
  constructor(container) {
    this.container = container;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.texture = null;
    this.running = false;
    this.loading = false;
    this.yaw = 0;
    this.pitch = 0;
    this.drag = null;
    this.frame = null;
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.animate = this.animate.bind(this);
  }

  async init() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, this.container.clientWidth / this.container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 0, 0.1);

    const geometry = new THREE.SphereGeometry(50, 64, 40);
    geometry.scale(-1, 1, 1);
    const loader = new THREE.TextureLoader();
    this.texture = await loader.loadAsync('/models/street-pano.jpg');
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: this.texture });
    this.scene.add(new THREE.Mesh(geometry, material));

    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('pointerleave', this.onPointerUp);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
  }

  onPointerDown(event) {
    this.drag = { x: event.clientX, y: event.clientY };
    this.container.setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event) {
    if (!this.drag) return;
    const dx = event.clientX - this.drag.x;
    const dy = event.clientY - this.drag.y;
    this.drag = { x: event.clientX, y: event.clientY };
    this.yaw -= dx * 0.0035;
    this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch - dy * 0.0035));
  }

  onPointerUp() {
    this.drag = null;
  }

  onWheel(event) {
    event.preventDefault();
    const fov = this.camera.fov + Math.sign(event.deltaY) * 3;
    this.camera.fov = Math.max(35, Math.min(90, fov));
    this.camera.updateProjectionMatrix();
  }

  animate() {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.animate);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.renderer.render(this.scene, this.camera);
  }

  async open() {
    this.container.hidden = false;
    const hint = document.getElementById('splatLoadingHint');
    const loading = document.getElementById('splatLoading');
    if (loading) {
      loading.hidden = false;
      loading.classList.remove('is-done');
    }
    if (hint) hint.textContent = '正在载入 SpatialGen 全景图（1.1MB）…';

    try {
      await this.init();
      this.running = true;
      this.animate();
      if (hint) hint.textContent = '拖动环视 · 滚轮缩放';
      window.setTimeout(() => {
        loading?.classList.add('is-done');
        window.setTimeout(() => {
          if (loading) loading.hidden = true;
        }, 420);
      }, 300);
      return true;
    } catch (error) {
      console.warn('[PanoStreet] 加载失败：', error?.message || error);
      if (hint) hint.textContent = '全景图加载失败，请检查 /models/street-pano.jpg';
      return false;
    }
  }

  close() {
    this.container.hidden = true;
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}
