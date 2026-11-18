import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

// spz v3 当前库不支持（deserializePackedGaussians: version not supported: 3），改用 ply
const SCENE_URL = '/models/street.ply';
const OPEN_TIMEOUT = 90000;

/**
 * SpatialGen（World API）生成的 3DGS 街景。
 * 用高斯泼溅查看器单独渲染，避免和主场景的 PBR 渲染管线互相干扰。
 *
 * 优化点：
 * 1. preload() 在空闲时先把 7.9MB 场景抓进 HTTP 缓存；
 * 2. 首次打开显示明确的加载层，而不是黑屏；
 * 3. 超时/失败返回 false，由调用方回退到程序化街市。
 */
export class SplatStreet {
  constructor(container) {
    this.container = container;
    this.viewer = null;
    this.scenePromise = null;
    this.preloadPromise = null;
    this.ready = false;
    this.loadingEl = document.getElementById('splatLoading');
    this.hintEl = document.getElementById('splatLoadingHint');
  }

  setHint(text) {
    if (this.hintEl) this.hintEl.textContent = text;
  }

  showLoading() {
    if (!this.loadingEl) return;
    this.loadingEl.hidden = false;
    this.loadingEl.classList.remove('is-done');
  }

  hideLoading() {
    if (!this.loadingEl) return;
    this.loadingEl.classList.add('is-done');
    window.setTimeout(() => {
      this.loadingEl.hidden = true;
    }, 420);
  }

  /** 空闲时预取场景文件，让首次进入少等一次下载。 */
  preload() {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = fetch(SCENE_URL, { cache: 'force-cache' })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (blob) console.info(`[SplatStreet] 已预取 ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
        return blob;
      })
      .catch(() => null);
    return this.preloadPromise;
  }

  async open() {
    this.container.hidden = false;

    if (this.ready) return true;

    this.showLoading();
    this.setHint(this.viewer ? '正在载入街市场景…' : '正在初始化 3DGS 渲染器（首次较慢）…');
    const startedAt = performance.now();
    const ticker = window.setInterval(() => {
      const sec = Math.round((performance.now() - startedAt) / 1000);
      this.setHint(`正在载入 3DGS 街景… ${sec}s（首次需下载并排序泼溅）`);
    }, 1000);

    if (!this.viewer) {
      this.viewer = new GaussianSplats3D.Viewer({
        rootElement: this.container,
        cameraUp: [0, 0, 1],
        initialCameraPosition: [0, -180, 90],
        initialCameraLookAt: [0, 0, 35],
        selfDrivenMode: true,
        useBuiltInControls: true,
        sharedMemoryForWorkers: false
      });
      this.scenePromise = this.viewer.addSplatScene(SCENE_URL, {
        showLoadingUI: false,
        progressiveLoad: true
      });
    }

    try {
      await Promise.race([
        this.scenePromise,
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('timeout')), OPEN_TIMEOUT);
        })
      ]);
      window.clearInterval(ticker);
      this.ready = true;
      this.hideLoading();
      console.info(`[SplatStreet] ready in ${Math.round(performance.now() - startedAt)}ms`);
      return true;
    } catch (error) {
      window.clearInterval(ticker);
      console.warn('[SplatStreet] 加载失败或超时：', error?.message || error);
      this.setHint('3DGS 街景加载失败：当前设备可能不支持高斯泼溅渲染，已退回展厅。');
      this.hideLoading();
      return false;
    }
  }

  close() {
    this.container.hidden = true;
  }

  dispose() {
    this.viewer?.dispose();
    this.viewer = null;
    this.scenePromise = null;
    this.ready = false;
  }
}
