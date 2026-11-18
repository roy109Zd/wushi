import * as THREE from 'three';
import { HOTSPOTS } from './hotspots.js';

/**
 * 部位热点导览：把模型上的五个点变成可点击的展签。
 * 标记挂在 stageRoot 下，所以自动旋转时会跟着模型走；
 * 投影到屏幕后再用 DOM 定位，保证文字始终正对观众。
 */
export class HotspotTour {
  constructor({ stageRoot, camera, viewerControls, modelManager, onRotateChange = () => {} }) {
    this.stageRoot = stageRoot;
    this.camera = camera;
    this.viewerControls = viewerControls;
    this.modelManager = modelManager;
    this.onRotateChange = onRotateChange;

    this.layer = document.getElementById('hotspotLayer');
    this.card = document.getElementById('hotspotCard');
    this.activeId = null;
    this.anchors = new Map();
    this.hotspotById = new Map(HOTSPOTS.map((item) => [item.id, item]));

    this.worldPoint = new THREE.Vector3();
    this.center = new THREE.Vector3(0, 1.55, 0);
    this.forwardCheck = new THREE.Vector3();

    this.buildMarkers();
    this.bindCard();
  }

  buildMarkers() {
    if (!this.layer) return;

    this.layer.innerHTML = HOTSPOTS.map((hotspot) => `
      <button class="hotspot is-hidden" type="button" data-hotspot="${hotspot.id}" aria-label="查看${hotspot.label}">
        <em>${hotspot.index}</em>
        <span>${hotspot.label}</span>
      </button>
    `).join('');

    this.buttons = [...this.layer.querySelectorAll('.hotspot')];
    this.buttons.forEach((button) => {
      button.addEventListener('click', () => this.select(button.dataset.hotspot));
    });

    HOTSPOTS.forEach((hotspot) => {
      const anchor = new THREE.Object3D();
      anchor.name = `Hotspot_${hotspot.id}`;
      anchor.position.fromArray(hotspot.position);
      this.stageRoot.add(anchor);
      this.anchors.set(hotspot.id, anchor);
    });
  }

  bindCard() {
    if (!this.card) return;

    this.cardTitle = document.getElementById('hotspotTitle');
    this.cardKicker = document.getElementById('hotspotKicker');
    this.cardBody = document.getElementById('hotspotBody');
    this.cardIndex = document.getElementById('hotspotIndex');

    document.getElementById('hotspotClose')?.addEventListener('click', () => this.close());
    document.getElementById('hotspotPrev')?.addEventListener('click', () => this.step(-1));
    document.getElementById('hotspotNext')?.addEventListener('click', () => this.step(1));
    document.getElementById('hotspotReset')?.addEventListener('click', () => {
      this.close();
      this.viewerControls.resetView();
      this.onReset?.();
    });
  }

  select(id) {
    const hotspot = this.hotspotById.get(id);
    if (!hotspot) return;

    this.activeId = id;
    this.buttons.forEach((button) => {
      button.classList.toggle('active', button.dataset.hotspot === id);
    });

    // 聚焦时先停掉自动旋转，否则目标点会一直转走
    if (this.modelManager.isAutoRotating) {
      const enabled = this.modelManager.toggleAutoRotate();
      this.onRotateChange(enabled);
    }

    const target = this.stageRoot.localToWorld(new THREE.Vector3().fromArray(hotspot.position));
    const cameraPoint = new THREE.Vector3()
      .fromArray(hotspot.position)
      .add(new THREE.Vector3().fromArray(hotspot.camera));
    const cameraPosition = this.stageRoot.localToWorld(cameraPoint);

    this.viewerControls.focusOn(target, cameraPosition);
    this.renderCard(hotspot);
  }

  step(direction) {
    const index = HOTSPOTS.findIndex((item) => item.id === this.activeId);
    const next = HOTSPOTS[(index + direction + HOTSPOTS.length) % HOTSPOTS.length];
    this.select(next.id);
  }

  renderCard(hotspot) {
    if (!this.card) return;
    this.card.hidden = false;
    this.card.classList.add('visible');
    if (this.cardTitle) this.cardTitle.textContent = hotspot.title;
    if (this.cardKicker) this.cardKicker.textContent = hotspot.kicker;
    if (this.cardBody) this.cardBody.textContent = hotspot.body;
    if (this.cardIndex) this.cardIndex.textContent = `${hotspot.index} / 0${HOTSPOTS.length}`;
  }

  close() {
    this.activeId = null;
    this.buttons?.forEach((button) => button.classList.remove('active'));
    if (this.card) {
      this.card.classList.remove('visible');
      this.card.hidden = true;
    }
  }

  /** 复用同一张卡片展示空间展品（鼓、香炉、龙、宫灯）的说明。 */
  showInfo({ kicker, title, body, index = 'SPACE' }) {
    if (!this.card) return;
    this.activeId = null;
    this.buttons?.forEach((button) => button.classList.remove('active'));
    this.card.hidden = false;
    this.card.classList.add('visible');
    if (this.cardKicker) this.cardKicker.textContent = kicker || '';
    if (this.cardTitle) this.cardTitle.textContent = title || '';
    if (this.cardBody) this.cardBody.textContent = body || '';
    if (this.cardIndex) this.cardIndex.textContent = index;
  }

  update() {
    if (!this.layer || !this.buttons?.length) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const cameraPosition = this.camera.position;
    const center = this.stageRoot.localToWorld(this.center.clone());

    this.buttons.forEach((button) => {
      const anchor = this.anchors.get(button.dataset.hotspot);
      if (!anchor) return;

      anchor.getWorldPosition(this.worldPoint);
      const projected = this.worldPoint.clone().project(this.camera);

      this.forwardCheck.copy(this.worldPoint).sub(center);
      const toCamera = cameraPosition.clone().sub(center);
      const facing = this.forwardCheck.dot(toCamera) > -0.15;

      const inside = Math.abs(projected.x) < 1.15
        && Math.abs(projected.y) < 1.15
        && projected.z < 1;

      if (!facing || !inside) {
        button.classList.add('is-hidden');
        return;
      }

      button.classList.remove('is-hidden');
      button.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      button.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    });
  }

  dispose() {
    this.buttons?.forEach((button) => button.replaceWith(button.cloneNode(true)));
    this.anchors.forEach((anchor) => anchor.removeFromParent());
    this.anchors.clear();
  }
}
