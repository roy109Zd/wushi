import { ACTIONS, MATERIALS, MATERIAL_ORDER, STAGE_MOODS, VIEW_MODES, VIEW_PRESETS } from './config.js';
import { CURATION_CHAPTERS, getCurationChapter } from './curation.js';
import { MATERIAL_DOSSIERS } from './dossier.js';
import { STORY_CHAPTERS } from './story.js';
import { TRAINING_CHAPTERS } from './training.js';
import { formatCount } from './utils.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export class UIManager {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.referenceFile = null;
    this.referenceUrl = null;
    this.toastTimer = null;
    this.panelOpen = false;

    this.renderCuration();
    this.renderMaterialControls();
    this.renderActionControls();
    this.renderStageMoods();
    this.renderViewPresets();
    this.renderViewModes();
    this.renderStory();
    this.renderTraining();

    this.materialButtons = $$('[data-material]');
    this.modeButtons = $$('[data-mode]');
    this.actionButtons = $$('[data-action]');
    this.moodButtons = $$('.mood-card');
    this.viewButtons = $$('[data-view]');
    this.viewModeButtons = $$('[data-viewmode]');
    this.storyButtons = $$('[data-story]');
    this.trainingButtons = $$('[data-training]');
    this.dossier = $('#materialDossier');
    this.loadingOverlay = $('#loadingOverlay');
    this.loadingTitle = $('#loadingTitle');
    this.loadingSubtitle = $('#loadingSubtitle');
    this.loadingProgress = $('#loadingProgress');
    this.loadingPercent = $('#loadingPercent');
    this.controlRail = $('#controlRail');
    this.panelToggle = $('#panelToggle');
    this.toast = $('#toast');

    this.bindEvents();
    this.setChapter('origin');
    this.setAIStatus('offline', '材质迁移链路已跑通：运行 npm run material -- <参考图> 可生成新皮肤；展厅里已有一件 AI 鎏金。');
  }

  renderCuration() {
    const list = $('#curationList');
    if (!list) return;
    list.innerHTML = CURATION_CHAPTERS.map((chapter) => `<button type="button" data-chapter="${chapter.id}" aria-pressed="false">
      <span>${chapter.number}</span><strong>${chapter.label}</strong><i></i>
    </button>`).join('');
  }

  setChapter(id) {
    const chapter = getCurationChapter(id);
    $$('[data-chapter]').forEach((button) => {
      const active = button.dataset.chapter === chapter.id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const index = $('#chapterIndex');
    const kicker = $('#chapterKicker');
    const title = $('#chapterTitle');
    const body = $('#chapterBody');
    const cue = $('#chapterCue');
    if (index) index.textContent = `${chapter.number} / ${String(CURATION_CHAPTERS.length).padStart(2, '0')}`;
    if (kicker) kicker.textContent = chapter.kicker;
    if (title) title.textContent = chapter.title;
    if (body) body.textContent = chapter.body;
    if (cue) cue.textContent = chapter.cue;
    this.activeChapter = chapter.id;
  }

  focusControlSection(selector) {
    const element = $(selector);
    if (!element) return;
    if (window.matchMedia('(max-width: 820px)').matches) this.setPanelOpen(true);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.remove('focus-pulse');
    requestAnimationFrame(() => element.classList.add('focus-pulse'));
    window.setTimeout(() => element.classList.remove('focus-pulse'), 1600);
  }

  renderMaterialControls() {
    const materialList = $('#materialList');
    const dockMaterials = $('#dockMaterialButtons');

    if (materialList) {
      materialList.innerHTML = MATERIAL_ORDER.map((key) => {
        const material = MATERIALS[key];
        return `<button class="material-card ${key === 'original' ? 'active' : ''}" type="button" data-material="${key}" aria-pressed="${key === 'original'}">
          <span class="material-thumb ${material.swatch}"><i></i></span>
          <span class="material-card-copy">
            <span class="material-card-top"><strong>${material.name}</strong><small>${material.number}</small></span>
            <span class="material-card-en">${material.english}</span>
            <span class="material-card-desc">${material.summary}</span>
          </span>
          <span class="material-check" aria-hidden="true">✓</span>
        </button>`;
      }).join('');
    }

    if (dockMaterials) {
      dockMaterials.innerHTML = MATERIAL_ORDER.map((key) => {
        const material = MATERIALS[key];
        return `<button class="dock-swatch ${material.swatch} ${key === 'original' ? 'active' : ''}" type="button" data-material="${key}" aria-label="切换到${material.name}" title="${material.name}"><span>${material.number}</span></button>`;
      }).join('');
    }

    const count = $('#materialCount');
    if (count) count.textContent = String(MATERIAL_ORDER.length).padStart(2, '0');
    const total = $('#materialTotal');
    if (total) total.textContent = String(MATERIAL_ORDER.length).padStart(2, '0');
  }

  renderActionControls() {
    const actionGrid = $('#actionGrid');
    if (!actionGrid) return;

    actionGrid.innerHTML = ACTIONS.map((action) => {
      const wide = action.id === 'jump' ? ' action-wide' : '';
      const unavailable = action.available ? '' : ' unavailable';
      return `<button class="action-chip${unavailable}${wide}${action.id === 'idle' ? ' active' : ''}" type="button" data-action="${action.id}" aria-disabled="${!action.available}">
        <span>${action.name}</span><small>${action.status}</small>
      </button>`;
    }).join('');
  }

  renderStageMoods() {
    const list = $('#moodList');
    if (!list) return;

    list.innerHTML = STAGE_MOODS.map((mood, index) => {
      const active = index === 0;
      return `<button class="mood-card${active ? ' active' : ''}" type="button" data-mood="${mood.id}" role="radio" aria-checked="${active}" style="--mood-accent:${mood.accent}">
        <span class="mood-orb" data-mood="${mood.id}" aria-hidden="true"><i></i></span>
        <span class="mood-copy">
          <strong>${mood.name}</strong>
          <small>${mood.english}</small>
          <em>${mood.summary}</em>
        </span>
      </button>`;
    }).join('');
  }

  renderViewPresets() {
    const nav = $('#viewSwitch');
    if (!nav) return;

    nav.innerHTML = VIEW_PRESETS.map((preset, index) => {
      const active = index === 0;
      return `<button class="view-button${active ? ' active' : ''}" type="button" data-view="${preset.id}" aria-pressed="${active}" title="${preset.name} · ${preset.english}">
        <small>${preset.english}</small>
        <strong>${preset.name}</strong>
      </button>`;
    }).join('');
  }

  renderViewModes() {    const list = $('#viewModeList');
    if (!list) return;

    list.innerHTML = VIEW_MODES.map((mode, index) => {
      const active = index === 0;
      return `<button class="view-mode-chip${active ? ' active' : ''}" type="button" data-viewmode="${mode.id}" aria-pressed="${active}" title="${mode.hint}">
        <strong>${mode.name}</strong>
        <small>${mode.english}</small>
      </button>`;
    }).join('');
  }

  renderDossier(key) {
    if (!this.dossier) return;
    const material = MATERIALS[key];
    const dossier = MATERIAL_DOSSIERS[key];
    if (!material || !dossier) return;

    const mood = STAGE_MOODS.find((item) => item.id === dossier.mood);
    const bar = (label, english, value) => `
      <div class="dossier-param">
        <div class="dossier-param-head"><span>${label}</span><small>${english}</small><b>${value.toFixed(2)}</b></div>
        <span class="dossier-param-bar"><i style="width:${Math.round(value * 100)}%"></i></span>
      </div>`;

    this.dossier.innerHTML = `
      <div class="dossier-head">
        <span>MATERIAL DOSSIER</span>
        <small>${material.number} / ${String(MATERIAL_ORDER.length).padStart(2, '0')}</small>
      </div>
      <h4>${material.name}</h4>
      <p class="dossier-craft">${dossier.craft}</p>
      <p class="dossier-story">${dossier.story}</p>
      <div class="dossier-tags">${dossier.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
      <div class="dossier-palette" aria-label="材质色板">
        ${dossier.palette.map((color) => `<i style="--swatch:${color}"></i>`).join('')}
      </div>
      <div class="dossier-params">
        ${bar('金属度', 'METALNESS', dossier.params.metalness)}
        ${bar('粗糙度', 'ROUGHNESS', dossier.params.roughness)}
        ${typeof dossier.params.transmission === 'number' ? bar('通透度', 'TRANSMISSION', dossier.params.transmission) : ''}
      </div>
      ${mood ? `<button class="dossier-mood" type="button" data-mood-rec="${mood.id}">
        <span>推荐光调</span><strong>${mood.name}</strong><i>→</i>
      </button>` : ''}
    `;
  }

  renderStory() {
    const list = $('#storyList');
    if (!list) return;

    list.innerHTML = STORY_CHAPTERS.map((chapter) => `
      <button class="story-row" type="button" data-story="${chapter.id}">
        <span class="story-index">${chapter.index}</span>
        <span class="story-copy">
          <strong>${chapter.title}</strong>
          <small>${chapter.en}</small>
        </span>
        <i>→</i>
      </button>
    `).join('');
  }

  renderTraining() {
    const list = $('#trainingList');
    if (!list) return;

    list.innerHTML = TRAINING_CHAPTERS.map((chapter) => `
      <button class="story-row" type="button" data-training="${chapter.id}">
        <span class="story-index">${chapter.index}</span>
        <span class="story-copy">
          <strong>${chapter.title}</strong>
          <small>${chapter.en}</small>
        </span>
        <i>→</i>
      </button>
    `).join('');
  }

  bindEvents() {    this.materialButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        this.handlers.onMaterialSelect?.(button.dataset.material);
      });
    });

    this.moodButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onMoodSelect?.(button.dataset.mood);
      });
    });

    this.viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onViewSelect?.(button.dataset.view);
      });
    });

    this.viewModeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onViewModeSelect?.(button.dataset.viewmode);
      });
    });

    this.storyButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onStorySelect?.(button.dataset.story);
      });
    });

    this.trainingButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onTrainingSelect?.(button.dataset.training);
      });
    });

    this.dossier?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mood-rec]');
      if (button) this.handlers.onMoodSelect?.(button.dataset.moodRec);
    });

    this.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onModeSelect?.(button.dataset.mode);
      });
    });

    this.actionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onActionSelect?.(button.dataset.action);
      });
    });

    $('#autoRotateToggle')?.addEventListener('click', () => {
      const enabled = this.handlers.onAutoRotateToggle?.();
      if (typeof enabled === 'boolean') this.setAutoRotate(enabled);
    });

    $('#reloadExperience')?.addEventListener('click', () => {
      window.location.reload();
    });

    $('#resetView')?.addEventListener('click', () => {
      this.handlers.onResetView?.();
    });

    $('#exploreReturn')?.addEventListener('click', () => {
      this.handlers.onReturnToStage?.();
    });

    this.panelToggle?.addEventListener('click', () => {
      this.setPanelOpen(!this.panelOpen);
    });

    const uploadDrop = $('#uploadDrop');
    const fileInput = $('#aiReference');

    fileInput?.addEventListener('change', () => {
      this.setReferenceFile(fileInput.files?.[0] || null);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      uploadDrop?.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadDrop.classList.add('dragging');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      uploadDrop?.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadDrop.classList.remove('dragging');
      });
    });

    uploadDrop?.addEventListener('drop', (event) => {
      const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/'));
      this.setReferenceFile(file || null);
    });

    $$('[data-chapter]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setChapter(button.dataset.chapter);
        this.handlers.onChapterSelect?.(button.dataset.chapter);
      });
    });

    $$('.material-tags button').forEach((button) => {
      button.addEventListener('click', () => {
        const prompt = $('#aiPrompt');
        if (!prompt) return;
        prompt.value = button.dataset.prompt || '';
        prompt.focus();
      });
    });

    $('#aiGenerateButton')?.addEventListener('click', async () => {
      const button = $('#aiGenerateButton');
      if (button.dataset.busy === 'true') return;
      button.dataset.busy = 'true';
      button.disabled = true;
      this.setAIStatus('loading', '正在检查材质生成接口…');

      try {
        const result = await this.handlers.onAIGenerate?.({
          file: this.referenceFile,
          name: $('#aiMaterialName')?.value || '',
          prompt: $('#aiPrompt')?.value || ''
        });

        if (result?.ok) {
          this.setAIStatus('ready', result.message, result);
        } else {
          this.setAIStatus('offline', result?.message || '材质生成接口尚未接入。');
        }
      } catch (error) {
        this.setAIStatus('error', error.message || '材质请求失败。');
      } finally {
        button.dataset.busy = 'false';
        button.disabled = false;
      }
    });
  }

  setPanelOpen(open) {
    this.panelOpen = open;
    this.controlRail?.classList.toggle('mobile-open', open);
    this.panelToggle?.setAttribute('aria-expanded', String(open));
  }

  setMaterial(key, entry = null) {
    const material = MATERIALS[key];
    if (!material) return;

    this.renderDossier(key);

    this.materialButtons.forEach((button) => {
      const active = button.dataset.material === key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const number = $('#currentMaterialNumber');
    const name = $('#currentMaterialName');
    const description = $('#materialDescription');
    if (number) number.textContent = material.number;
    if (name) name.textContent = material.name;
    const count = $('#materialCount');
    if (count) count.textContent = String(MATERIAL_ORDER.length).padStart(2, '0');
    if (description) description.textContent = material.description;

    if (entry) this.updateModelMetrics(entry);
  }

  updateModelMetrics(entry) {
    const triangleCount = $('#triangleCount');
    if (triangleCount) {
      triangleCount.textContent = entry?.triangles
        ? `${formatCount(entry.triangles)} tris`
        : '读取失败';
    }

    const skeletonStatus = $('#skeletonStatus');
    if (skeletonStatus) {
      skeletonStatus.textContent = entry?.animations
        ? `内置 ${entry.animations} 段动画`
        : '静态模型 · 9 段动作可播';
    }
  }

  setEnvironment(environment) {
    const isSpatial = environment?.source === 'spatialgen';
    const sourceLabel = isSpatial ? environment.label : '程序化临时展厅';
    const environmentLabel = $('#environmentSource');
    if (environmentLabel) {
      environmentLabel.textContent = sourceLabel;
      environmentLabel.title = isSpatial
        ? '已加载群核 / SpatialGen 空间资产'
        : '当前为 Three.js 程序化展厅';
    }

    const chip = $('#stageMoodChip');
    if (chip) chip.textContent = isSpatial ? 'SPATIALGEN' : 'PROCEDURAL';
  }

  setMood(id) {
    this.moodButtons.forEach((button) => {
      const active = button.dataset.mood === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
    document.body.dataset.mood = id;
  }

  setViewPreset(id) {
    this.viewButtons.forEach((button) => {
      const active = button.dataset.view === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  setViewMode(id) {
    this.viewModeButtons.forEach((button) => {
      const active = button.dataset.viewmode === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const mode = VIEW_MODES.find((item) => item.id === id);
    const chip = $('#viewModeChip');
    const hint = $('#viewModeHint');
    if (chip) chip.textContent = mode?.english || 'SHADED';
    if (hint) hint.textContent = mode ? `${mode.name} · ${mode.hint}` : '';
  }

  setMode(mode) {
    document.body.classList.toggle('explore-mode', mode === 'explore');
    document.body.dataset.mode = mode;
    this.modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === mode);
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });

    const exploreHud = $('.explore-hud');
    exploreHud?.setAttribute('aria-hidden', String(mode !== 'explore'));
    if (mode === 'explore') this.setPanelOpen(false);
  }

  setAction(id, isPlaying = false) {
    this.actionButtons.forEach((button) => {
      const isCurrent = button.dataset.action === id;
      button.classList.toggle('active', isCurrent && (id === 'idle' || isPlaying));
    });
  }

  setAutoRotate(enabled) {
    const button = $('#autoRotateToggle');
    if (!button) return;
    button.classList.toggle('active', enabled);
    button.setAttribute('aria-pressed', String(enabled));
  }

  setLoading({
    title = '正在构筑东方展厅',
    subtitle = '灯光、材质与空间正在就位',
    progress = 0
  } = {}) {
    this.loadingOverlay?.classList.remove('hidden');
    if (this.loadingTitle) this.loadingTitle.textContent = title;
    if (this.loadingSubtitle) this.loadingSubtitle.textContent = subtitle;
    this.setLoadingProgress(progress);
  }

  showRecovery(message = '浏览器正在准备纹理与着色器，若长时间无响应可重新载入。') {
    if (this.loadingSubtitle) this.loadingSubtitle.textContent = message;
    const button = $('#reloadExperience');
    if (button) button.hidden = false;
  }

  setLoadingProgress(value) {
    const normalized = Math.max(0, Math.min(1, Number(value) || 0));
    const percent = Math.round(normalized * 100);
    if (this.loadingProgress) this.loadingProgress.style.width = `${percent}%`;
    if (this.loadingPercent) this.loadingPercent.textContent = `${percent}%`;
  }

  hideLoading() {
    this.setLoadingProgress(1);
    window.setTimeout(() => {
      this.loadingOverlay?.classList.add('hidden');
    }, 180);
  }

  setMaterialBusy(busy) {
    this.materialButtons.forEach((button) => {
      button.disabled = busy;
      button.classList.toggle('loading', busy && button.classList.contains('active'));
    });
  }

  setReferenceFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('参考图仅支持 PNG、JPG 或 WEBP 文件。');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.showToast('参考图请控制在 8MB 以内。');
      return;
    }

    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    this.referenceFile = file;
    this.referenceUrl = URL.createObjectURL(file);
    const image = $('#referenceImage');
    if (image) image.src = this.referenceUrl;
    $('#uploadDrop')?.classList.add('has-image');
  }

  setAIStatus(state, message, result = null) {
    const status = $('#aiTaskStatus');
    if (status) {
      status.dataset.state = state;
      const text = $('p', status);
      if (text) text.textContent = message;
    }

    const preview = $('#aiResultPreview');
    if (!preview) return;
    preview.classList.toggle('has-result', Boolean(result?.previewUrl));
    if (result?.previewUrl) {
      preview.innerHTML = `<img src="${result.previewUrl}" alt="AI 材质生成结果预览"><span>LUX3D RESULT PREVIEW</span>`;
    } else {
      preview.innerHTML = '<span>RESULT PREVIEW</span><p>真实生成结果将在此显示</p>';
    }
  }

  setAIConnection(connected) {
    const chip = $('#aiConnectionChip');
    if (!chip) return;
    chip.textContent = connected ? 'CONNECTED' : 'NOT CONNECTED';
    chip.classList.toggle('connected-chip', connected);
    chip.classList.toggle('offline-chip', !connected);
  }

  setPointerLock(locked) {
    const hint = $('#pointerLockHint');
    hint?.classList.toggle('locked', locked);
  }

  showToast(message, duration = 3200) {
    if (!this.toast) return;
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('visible');
    }, duration);
  }

  destroy() {
    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    window.clearTimeout(this.toastTimer);
  }
}
