import './style.css';
import * as THREE from 'three';
import { MaterialCreatorClient } from './ai-creator.js';
import { ActionTheater } from './action-theater.js';
import { ViewerController } from './camera-controls.js';
import { ACTIONS, MATERIAL_ORDER, MATERIALS, STAGE_MOODS, VIEW_MODES, VIEW_PRESETS } from './config.js';
import { buildEnvironment } from './environment/index.js';
import { HotspotTour } from './hotspot-tour.js';
import { ModelManager } from './model-manager.js';
import { RoamController } from './roam.js';
import { PanoStreet } from './pano-street.js';
import { STORY_CHAPTERS } from './story.js';
import { TRAINING_CHAPTERS } from './training.js';
import { createSceneContext } from './scene.js';
import { UIManager } from './ui.js';

// 允许 GLTFLoader 复用已下载的二进制，材质被缓存淘汰后再次切换无需重新走网络。
THREE.Cache.enabled = true;

const sceneContext = createSceneContext(document.getElementById('scene-container'));
const aiClient = new MaterialCreatorClient();

let environment;
let modelManager;
let actionTheater;
let viewerControls;
let hotspotTour;
let roamController;
let streetEntered = false;
let splatStreet = null;
let selectedMaterial = 'original';
let materialBusy = false;
let disposed = false;

let viewMode = 'shaded';
const originalMaterials = new WeakMap();
let normalMaterial = null;
let skeletonHelper = null;

const ui = new UIManager({
  onMaterialSelect: (key) => switchMaterial(key),
  onActionSelect: (id) => runAction(id),
  onModeSelect: (mode) => changeMode(mode),
  onMoodSelect: (id) => applyMood(id),
  onViewSelect: (id) => applyViewPreset(id),
  onViewModeSelect: (id) => setViewMode(id),
  onStorySelect: (id) => focusStory(id),
  onTrainingSelect: (id) => focusTraining(id),
  onAutoRotateToggle: () => toggleAutoRotate(),
  onResetView: () => {
    hotspotTour?.close();
    viewerControls.resetView();
    ui.showToast('正在恢复展厅默认视角。');
  },
  onReturnToStage: () => {
    viewerControls.setMode('exhibition');
    ui.showToast('已返回中央展台。');
  },
  onChapterSelect: (id) => focusCurationChapter(id),
  onAIGenerate: async (payload) => {
    const result = await aiClient.generate(payload);
    ui.showToast(result.message);
    return result;
  }
});

ui.setAIConnection(aiClient.connected);
if (aiClient.connected) {
  ui.setAIStatus('idle', 'Lux3D 后端地址已配置，生成结果仍以后端任务状态为准。');
}

function focusCurationChapter(id) {
  if (!viewerControls) return;
  if (id === 'origin' || id === 'form') {
    viewerControls.resetView();
    ui.showToast(id === 'origin'
      ? '导览 01：一位小狮童，让传统南狮成为可亲近的数字主角。'
      : '导览 02：旋转并放大模型，观察狮首、鬃毛与衣褶的连续形体。');
    return;
  }
  if (id === 'material') ui.focusControlSection('.material-panel');
  if (id === 'motion') ui.focusControlSection('.action-panel');
  if (id === 'cocreate') ui.focusControlSection('.ai-panel');
  if (id === 'stage') ui.focusControlSection('.stage-panel');
}

function applyMood(id) {
  const mood = STAGE_MOODS.find((item) => item.id === id);
  if (!mood) return;
  sceneContext.setMood(id);
  ui.setMood(id);
  ui.showToast(`布景切换为「${mood.name}」：${mood.summary}。`);
}

function applyViewPreset(id) {  const preset = VIEW_PRESETS.find((item) => item.id === id);
  if (!preset || !viewerControls) return;
  hotspotTour?.close();
  viewerControls.focusPreset(id);
  ui.showToast(`机位：${preset.name} · ${preset.english}`);
}

function toggleAutoRotate() {
  if (!modelManager) return false;
  const enabled = modelManager.toggleAutoRotate();
  ui.showToast(enabled ? '自动旋转已恢复。' : '自动旋转已暂停，可继续拖动观察。');
  return enabled;
}

function focusChapter(chapter, label, total, kind = 'story') {
  if (!chapter || !viewerControls) return;

  hotspotTour?.showInfo({
    kicker: chapter.kicker,
    title: chapter.title,
    body: chapter.body,
    index: `${chapter.index} / ${total}`
  });

  // 机位按展台位置现算：故事长廊在左墙，练功房在右展室，两者朝向不同
  const [x, , z] = chapter.position;
  const target = [x, 1.55, z];
  const camera = kind === 'training'
    ? [x, 2.75, z + 5.4]
    : [x + 5.6, 2.85, z + 0.6];

  viewerControls.focusOn(
    new THREE.Vector3().fromArray(target),
    new THREE.Vector3().fromArray(camera)
  );
  ui.showToast(`${label} ${chapter.index} · ${chapter.title}`);
}

function focusStory(id) {
  focusChapter(STORY_CHAPTERS.find((item) => item.id === id), '舞狮故事', '05', 'story');
}

function focusTraining(id) {
  focusChapter(TRAINING_CHAPTERS.find((item) => item.id === id), '练功', '04', 'training');
}

/* ------------------------------------------------------------------ *
 * 技术视图：材质 / 线框 / 法线 / 骨骼
 * 只改可见模型的材质表现，不动几何与动画数据。
 * ------------------------------------------------------------------ */

function currentModels() {
  const models = [];
  const actionEntry = actionTheater?.currentEntry;
  if (actionEntry?.model) models.push(actionEntry.model);
  const entry = modelManager?.getCurrentEntry();
  if (entry?.model) models.push(entry.model);
  return models;
}

function eachMesh(callback) {
  currentModels().forEach((model) => {
    model.traverse((child) => {
      if (child.isMesh) callback(child);
    });
  });
}

function restoreMaterials() {
  eachMesh((mesh) => {
    if (originalMaterials.has(mesh)) {
      mesh.material = originalMaterials.get(mesh);
      originalMaterials.delete(mesh);
    }

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((material) => {
      if (material && 'wireframe' in material && material.wireframe) {
        material.wireframe = false;
        material.needsUpdate = true;
      }
    });
  });
}

function removeSkeletonHelper() {
  if (!skeletonHelper) return;
  skeletonHelper.removeFromParent();
  skeletonHelper.geometry?.dispose();
  skeletonHelper.material?.dispose();
  skeletonHelper = null;
}

function applyViewMode() {
  removeSkeletonHelper();
  restoreMaterials();

  if (viewMode === 'wireframe') {
    eachMesh((mesh) => {
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      list.forEach((material) => {
        if (material && 'wireframe' in material) {
          material.wireframe = true;
          material.needsUpdate = true;
        }
      });
    });
  }

  if (viewMode === 'normal') {
    normalMaterial = normalMaterial || new THREE.MeshNormalMaterial();
    eachMesh((mesh) => {
      originalMaterials.set(mesh, mesh.material);
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(() => normalMaterial)
        : normalMaterial;
    });
  }

  if (viewMode === 'skeleton') {
    const entry = actionTheater?.currentEntry;
    if (entry?.model) {
      skeletonHelper = new THREE.SkeletonHelper(entry.model);
      skeletonHelper.material.depthTest = false;
      skeletonHelper.material.transparent = true;
      skeletonHelper.material.opacity = 0.9;
      sceneContext.scene.add(skeletonHelper);
    }
  }

  ui.setViewMode(viewMode);
}

function setViewMode(id) {
  if (!VIEW_MODES.some((mode) => mode.id === id)) return;
  viewMode = id;
  applyViewMode();

  if (id === 'skeleton' && !actionTheater?.isPlaying) {
    ui.showToast('骨骼视图需要先播放一段动作，播放后会自动显示骨架。');
  }
}

async function switchMaterial(key) {
  if (!MATERIALS[key] || materialBusy) return;
  if (key === selectedMaterial && modelManager.getCurrentEntry()) return;

  materialBusy = true;
  ui.setMaterialBusy(true);
  // 先把上一个模型上的法线 / 线框状态还原，避免它带着技术视图留在缓存里
  restoreMaterials();

  // 已经下载过的材质直接走淡入淡出，不再用整屏加载遮罩打断展演。
  const cached = modelManager.hasEntry(key);
  if (!cached) {
    ui.setLoading({
      title: `正在切换为${MATERIALS[key].name}`,
      subtitle: '材质正在附着于同一副东方骨架',
      progress: 0.06
    });
  }

  try {
    // 正在播动作时切材质：不打断动作，只把新材质换到动作模型上
    const actionPlaying = actionTheater.isPlaying;

    const entry = await modelManager.show(key, {
      immediate: actionPlaying,
      onProgress: (progress) => {
        if (!cached) ui.setLoadingProgress(0.06 + progress * 0.88);
      }
    });
    selectedMaterial = key;
    ui.setMaterial(key, entry);

    if (actionTheater.isPlaying) {
      actionTheater.applyMaterialFrom(entry.group);
      modelManager.protect(key);
      modelManager.setVisible(false);
    }

    applyViewMode();

    if (!cached) {
      ui.setLoadingProgress(1);
      ui.hideLoading();
    }
    ui.showToast(`${MATERIALS[key].name}已就位，相机与模型比例保持不变。`);
  } catch (error) {
    console.error('[Material]', error);
    if (!cached) ui.hideLoading();
    ui.showToast(`材质切换失败：${error.message}`, 5000);
  } finally {
    materialBusy = false;
    ui.setMaterialBusy(false);
  }
}

async function runAction(id) {
  const definition = ACTIONS.find((action) => action.id === id);
  if (!definition) return;

  if (id === 'idle') {
    actionTheater.stop();
    applyViewMode();
    ui.setAction('idle');
    ui.showToast('已回到待机展示。当前为对象轻微呼吸动效，不是骨骼动画。');
    return;
  }

  if (!definition.available) {
    ui.setAction(actionTheater.currentActionId || 'idle', actionTheater.isPlaying);
    ui.showToast(`${definition.name} · ${definition.zh}：当前 GLB 未包含该骨骼动作，接口已预留。`);
    return;
  }

  if (actionTheater.currentActionId === id && definition.loop) {
    actionTheater.stop();
    ui.setAction('idle');
    ui.showToast(`已停止${definition.zh}循环动作。`);
    return;
  }

  ui.setLoading({
    title: `正在准备${definition.zh}动作`,
    subtitle: `从 ${definition.file} 读取 Mixamo 骨骼动画`,
    progress: 0.04
  });

  try {
    restoreMaterials();
    await actionTheater.play(id, {
      onProgress: (progress) => ui.setLoadingProgress(0.04 + progress * 0.92),
      onStart: ({ duration, skins, triangles, loop }) => {
        ui.hideLoading();
        ui.setAction(id, true);
        applyViewMode();
        const skeletonStatus = document.getElementById('skeletonStatus');
        if (skeletonStatus) skeletonStatus.textContent = `真实骨骼 · ${definition.zh}播放中`;
        ui.showToast(
          `真实骨骼${definition.zh}：${duration.toFixed(2)}s · ${skins} 套蒙皮 · ${Math.round(triangles / 10000)} 万三角面${loop ? ' · 循环播放' : ''}`
        );
      }
    });
  } catch (error) {
    console.error('[Action]', error);
    ui.hideLoading();
    ui.setAction('idle');
    ui.showToast(error.message, 5000);
  }
}

function changeMode(mode) {
  if (mode === 'roam') {
    if (roamController?.active) return;
    hotspotTour?.close();
    if (viewerControls.mode === 'explore') viewerControls.setMode('exhibition');
    if (modelManager.isAutoRotating) {
      modelManager.toggleAutoRotate();
      ui.setAutoRotate(false);
    }
    roamController.enter();
    ui.setMode('roam');
    ui.showToast('角色漫游：W/S 前后，A/D 转身，Shift 奔跑，空格跳跃（含落地），C 蹲伏行走，X 滑铲；沿红毯走到右侧朱门可去街市。', 6000);
    return;
  }

  if (roamController?.active) {
    roamController.exit();
    if (mode === 'exhibition') {
      ui.setMode('exhibition');
      return;
    }
  }

  if (mode === viewerControls.mode) {
    if (mode === 'explore' && document.pointerLockElement !== sceneContext.renderer.domElement) {
      viewerControls.requestPointerLock();
    }
    return;
  }

  viewerControls.setMode(mode, { lockPointer: mode === 'explore' });
}

function onModeChange(mode) {
  ui.setMode(mode);
  if (mode === 'explore') {
    ui.showToast('自由探索已开启：WASD 移动，鼠标观察，Shift 加速。');
  }
}

function isTypingTarget(target) {
  if (!target) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

function onShortcut(event) {
  if (disposed || event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;
  if (roamController?.active) return;
  // 漫游模式里 W / A / S / D 已被移动占用，避免与快捷键冲突。
  if (viewerControls?.mode === 'explore') return;

  const key = event.key.toLowerCase();

  if (key === '1' || key === '2' || key === '3') {
    const materialKey = MATERIAL_ORDER[Number(key) - 1];
    if (materialKey) {
      event.preventDefault();
      switchMaterial(materialKey);
    }
    return;
  }

  if (key === 'v') {
    event.preventDefault();
    const next = viewerControls?.cyclePreset();
    if (next) ui.showToast(`机位：${next.name}`);
    return;
  }

  if (key === 'r') {
    event.preventDefault();
    viewerControls?.resetView();
    ui.showToast('已复位到默认全景机位。');
    return;
  }

  if (key === 'a') {
    event.preventDefault();
    const enabled = toggleAutoRotate();
    ui.setAutoRotate(enabled);
  }
}

/* ------------------------------------------------------------------ *
 * 空间展品点击：鼓、香炉、盘龙、宫灯共用一张说明卡
 * ------------------------------------------------------------------ */

const raycaster = new THREE.Raycaster();
const pickingPointer = new THREE.Vector2();
let pickingStart = null;

function onPickDown(event) {
  if (event.button !== 0) return;
  pickingStart = { x: event.clientX, y: event.clientY, time: performance.now() };
}

function onPickUp(event) {
  if (!pickingStart) return;
  const moved = Math.hypot(event.clientX - pickingStart.x, event.clientY - pickingStart.y);
  const elapsed = performance.now() - pickingStart.time;
  pickingStart = null;

  // 拖动过视角就不算点击
  if (moved > 6 || elapsed > 600) return;
  if (viewerControls?.mode === 'explore') return;

  const interactives = environment?.interactives;
  if (!interactives?.length) return;

  const rect = sceneContext.renderer.domElement.getBoundingClientRect();
  pickingPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pickingPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pickingPointer, sceneContext.camera);

  const targets = interactives.map((item) => item.object).filter((object) => object?.visible);
  if (!targets.length) return;

  const hit = raycaster.intersectObjects(targets, true)[0];
  if (!hit) return;

  const entry = interactives.find((item) => {
    let node = hit.object;
    while (node) {
      if (node === item.object) return true;
      node = node.parent;
    }
    return false;
  });

  if (entry) {
    hotspotTour?.showInfo(entry);
    if (entry.focus) {
      viewerControls.focusOn(
        new THREE.Vector3().fromArray(entry.focus.target),
        new THREE.Vector3().fromArray(entry.focus.camera)
      );
    }
  }
}

function notifyStreetEntered() {
  if (streetEntered) return;
  streetEntered = true;
  ui.showToast('已进入长安街市：街上三个行人会来回走，沿街可继续逛。', 5200);
}

function schedulePreload() {  const run = () => {
    if (disposed) return;
    modelManager?.preloadNearby(1).catch((error) => console.warn('[Preload]', error));
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 2200);
  }
}

async function init() {
  ui.setLoading({
    title: '正在构筑东方展厅',
    subtitle: '灯光、材质与空间正在就位',
    progress: 0.04
  });

  environment = await buildEnvironment({
    onSpatialGenProgress: (progress) => ui.setLoadingProgress(0.04 + progress * 0.2)
  });
  sceneContext.scene.add(environment.group);
  const hallRoot = sceneContext.scene.getObjectByName('ProceduralOrientalHall');
  ui.setEnvironment(environment);
  sceneContext.setMood('ink');
  ui.setMood('ink');
  ui.setViewPreset('full');

  modelManager = new ModelManager({
    scene: sceneContext.scene,
    stageTop: environment.stageTop,
    onBackgroundError: (error) => console.warn('[Preload]', error)
  });

  actionTheater = new ActionTheater({
    stageRoot: modelManager.stageRoot,
    modelManager,
    onFinished: () => {
      ui.setAction('idle');
      applyViewMode();
      const skeletonStatus = document.getElementById('skeletonStatus');
      if (skeletonStatus) skeletonStatus.textContent = '静态模型 · 9 段动作可播';
      ui.showToast('骨骼动作播放完成，已回到当前材质。');
    }
  });

  viewerControls = new ViewerController({
    camera: sceneContext.camera,
    domElement: sceneContext.renderer.domElement,
    colliders: environment.colliders,
    onModeChange,
    onPointerLockChange: (locked) => ui.setPointerLock(locked),
    onPresetChange: (id) => ui.setViewPreset(id)
  });

  hotspotTour = new HotspotTour({
    stageRoot: modelManager.stageRoot,
    camera: sceneContext.camera,
    viewerControls,
    modelManager,
    onRotateChange: (enabled) => ui.setAutoRotate(enabled)
  });

  roamController = new RoamController({
    stageRoot: modelManager.stageRoot,
    stageTop: environment.stageTop,
    camera: sceneContext.camera,
    actionTheater,
    viewerControls,
    onExit: () => {
      modelManager.setVisible(true);
    }
  });

  document.getElementById('portalStreet')?.addEventListener('click', () => {
    if (viewerControls.mode === 'explore') viewerControls.setMode('exhibition');
    const spawn = { x: 30.5, z: 0, heading: Math.PI / 2 };
    if (roamController.active) {
      roamController.teleport(spawn);
    } else {
      roamController.enter(spawn);
      ui.setMode('roam');
    }
    console.info('[Portal] 已传送至街市', spawn);
    ui.showToast('已传送至长安街市：W/S 前进，A/D 转身，Q 退出。', 4200);
  });

  const splatStage = document.getElementById('splatStage');
  if (splatStage) {
    splatStreet = new PanoStreet(splatStage);
    document.getElementById('portalSplat')?.addEventListener('click', async () => {
      if (viewerControls.mode === 'explore') viewerControls.setMode('exhibition');
      if (roamController.active) roamController.exit();
      ui.setMode('exhibition');
      const ok = await splatStreet.open();
      if (!ok) ui.showToast('全景街景加载失败，可继续使用「传送至街市」。', 5200);
    });
    document.getElementById('splatBack')?.addEventListener('click', () => {
      splatStreet.close();
      changeMode('roam');
    });
    window.__SPLAT__ = splatStreet;
  }


  sceneContext.renderer.domElement.addEventListener('pointerdown', onPickDown);
  sceneContext.renderer.domElement.addEventListener('pointerup', onPickUp);

  window.addEventListener('keydown', onShortcut);

  ui.setLoading({
    title: '正在唤醒小狮童',
    subtitle: '读取醒狮模型、纹理与 PBR 材质',
    progress: 0.25
  });

  const entry = await modelManager.show('original', {
    immediate: true,
    onProgress: (progress) => ui.setLoadingProgress(0.25 + progress * 0.7)
  });
  ui.setMaterial('original', entry);
  ui.setAutoRotate(true);
  ui.setViewMode('shaded');
  ui.hideLoading();
  schedulePreload();

  const clock = new THREE.Clock();
  let elapsed = 0;

  sceneContext.renderer.setAnimationLoop(() => {
    if (disposed) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;

    modelManager.update(delta, elapsed);
    actionTheater.update(delta);
    roamController?.update(delta);
  if (roamController?.active && modelManager.stageRoot.position.x > 21) {
    notifyStreetEntered();
  }
    viewerControls.update(delta);
    hotspotTour.update();
    environment.update(elapsed, delta);
    sceneContext.render();
  });

  window.__MATERIAL_MAGICIAN__ = {
    roamController,
    scene: sceneContext.scene,
    camera: sceneContext.camera,
    renderer: sceneContext.renderer,
    modelManager,
    actionTheater,
    viewerControls,
    environment,
    sceneContext
  };
}

function cleanup() {
  if (disposed) return;
  disposed = true;
  sceneContext.renderer.setAnimationLoop(null);
  window.removeEventListener('beforeunload', cleanup);
  window.removeEventListener('keydown', onShortcut);
  sceneContext.renderer.domElement.removeEventListener('pointerdown', onPickDown);
  sceneContext.renderer.domElement.removeEventListener('pointerup', onPickUp);
  removeSkeletonHelper();
  normalMaterial?.dispose();
  viewerControls?.dispose();
  actionTheater?.dispose();
  hotspotTour?.dispose();
  roamController?.dispose();
  modelManager?.dispose();
  environment?.dispose();
  ui.destroy();
  sceneContext.dispose();
  delete window.__MATERIAL_MAGICIAN__;
}

window.addEventListener('beforeunload', cleanup);
window.addEventListener('materialmagician:webglcontextlost', () => {
  ui.setLoading({
    title: '图形上下文已中断',
    subtitle: '请重新载入展厅以恢复 WebGL 渲染',
    progress: 0
  });
  ui.showRecovery('显卡或浏览器回收了 WebGL 上下文，重新载入即可恢复。');
});
window.setTimeout(() => {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay?.classList.contains('hidden')) {
    ui.showRecovery('首次读取高精度模型可能较慢；若超过一分钟仍无响应，请重新载入。');
  }
}, 18000);
init().catch((error) => {
  console.error('[Init]', error);
  ui.setLoading({
    title: '展厅初始化失败',
    subtitle: error.message || '请检查模型路径与浏览器 WebGL 支持',
    progress: 0
  });
  ui.showToast(`初始化失败：${error.message}`, 7000);
});
