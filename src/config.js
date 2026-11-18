export const MATERIALS = {
  original: {
    id: 'original',
    number: '01',
    name: '原始醒狮',
    shortName: '素胚',
    english: 'ORIGINAL CLAY',
    file: '/models/醒狮.glb',
    summary: '中性素模 · 形体与褶皱',
    description: '保留狮头、鬃毛、服饰褶皱与祥云浮雕的完整形体，以中性素模呈现造型本身的张力。',
    accent: '#c6a87c',
    swatch: 'swatch-original'
  },
  metal: {
    id: 'metal',
    number: '02',
    name: '鎏金醒狮',
    shortName: '鎏金',
    english: 'GILT BRONZE',
    file: '/models/金属.glb',
    summary: '古铜暖金 · 曲面高光',
    description: '古铜与暖金在曲面间游走，强化狮头鳞片、鬃毛与衣纹的层次，像一件被时间打磨的东方金器。',
    accent: '#d2a756',
    swatch: 'swatch-metal'
  },
  ceramic: {
    id: 'ceramic',
    number: '03',
    name: '彩釉醒狮',
    shortName: '彩釉',
    english: 'POLYCHROME GLAZE',
    file: '/models/陶瓷彩釉.glb',
    summary: '朱红青绿 · 温润釉光',
    description: '将民俗配色凝结于温润釉面，朱红、青绿与金色纹样在灯光下呈现含蓄而鲜活的光泽。',
    accent: '#c45d45',
    swatch: 'swatch-ceramic'
  },
  marble: {
    id: 'marble',
    number: '04',
    name: '大理石醒狮',
    shortName: '大理石',
    english: 'SCULPTED MARBLE',
    file: '/models/大理石.glb',
    summary: '灰白纹理 · 石雕重量',
    description: '将醒狮化作一尊当代石雕，流动石纹穿过鬃毛与衣褶，在厚重体量中保留传统造型的灵动。',
    accent: '#d7d3ca',
    swatch: 'swatch-marble'
  },
  glass: {
    id: 'glass',
    number: '05',
    name: '澄明玻璃醒狮',
    shortName: '玻璃',
    english: 'CLEAR GLASS',
    file: '/models/玻璃.glb',
    summary: '清透折射 · 光影轮廓',
    description: '以通透玻璃重构狮头与衣纹，让暖金光穿过形体，形成介于实体雕塑与光影装置之间的视觉层次。',
    accent: '#b8d0c9',
    swatch: 'swatch-glass'
  },
  coloredGlass: {
    id: 'coloredGlass',
    number: '06',
    name: '彩璃醒狮',
    shortName: '彩璃',
    english: 'COLORED GLASS',
    file: '/models/彩色玻璃（不透光）.glb',
    summary: '彩窗拼色 · 内敛光泽',
    description: '以彩色玻璃的拼合感表现狮头、绣球与服饰，让民俗色彩像东方花窗一样被灯光重新点亮。',
    accent: '#b86251',
    swatch: 'swatch-colored-glass'
  },
  whitePorcelain: {
    id: 'whitePorcelain',
    number: '07',
    name: '白瓷醒狮',
    shortName: '白瓷',
    english: 'WHITE PORCELAIN',
    file: '/models/白瓷.glb',
    summary: '凝脂白釉 · 清雅器韵',
    description: '温润白釉包裹完整形体，以微妙高光勾勒鬃毛和浮雕细节，呈现克制、清雅的东方器物气质。',
    accent: '#ece5d8',
    swatch: 'swatch-porcelain'
  },
  felt: {
    id: 'felt',
    number: '08',
    name: '羊毛毡醒狮',
    shortName: '毛毡',
    english: 'WOOL FELT',
    file: '/models/毛毡（木头）.glb',
    summary: '纤维暖意 · 木色柔和',
    description: '用柔软纤维与温暖木色削弱雕塑的边界，使醒狮更接近可以触摸的潮玩手办与民间玩具。',
    accent: '#c08c63',
    swatch: 'swatch-felt'
  },
  aiMetal: {
    id: 'aiMetal',
    number: '09',
    name: 'AI 鎏金醒狮',
    shortName: 'AI 金',
    english: 'AI TRANSFER',
    file: '/models/ai-metal.glb',
    summary: '参考图迁移 · 金属反射',
    description: '用一张金属参考图，通过 Lux3D 的材质迁移（material-transfer）直接生成的新皮肤。它证明材质可以不是预设的，而是现场「做」出来的。',
    accent: '#d8b06a',
    swatch: 'swatch-metal'
  }
};

export const MATERIAL_ORDER = [
  'original',
  'metal',
  'ceramic',
  'marble',
  'glass',
  'coloredGlass',
  'whitePorcelain',
  'felt',
  'aiMetal'
];

export const ACTIONS = [
  {
    id: 'idle',
    name: 'Idle',
    zh: '待机',
    status: '对象动效',
    available: true,
    kind: 'procedural'
  },
  {
    id: 'nod',
    name: 'Nod',
    zh: '点头',
    status: '真实骨骼 · 单次',
    available: true,
    kind: 'clip',
    file: '/models/点头同意.glb',
    loop: false,
    duration: 2.5
  },
  {
    id: 'dance',
    name: 'Dance',
    zh: '跳舞',
    status: '真实骨骼 · 循环',
    available: true,
    kind: 'clip',
    file: '/models/跳舞.glb',
    loop: true,
    duration: 1.0
  },
  {
    id: 'punch',
    name: 'Punch',
    zh: '直拳',
    status: '真实骨骼 · 单次',
    available: true,
    kind: 'clip',
    file: '/models/直拳.glb',
    loop: false,
    duration: 1.0
  },
  {
    id: 'roll',
    name: 'Roll',
    zh: '翻滚',
    status: '真实骨骼 · 单次',
    available: true,
    kind: 'clip',
    file: '/models/翻滚.glb',
    loop: false,
    duration: 1.467
  },
  {
    id: 'walk',
    name: 'Walk',
    zh: '走路',
    status: '真实骨骼 · 循环',
    available: true,
    kind: 'clip',
    file: '/models/走路.glb',
    loop: true,
    duration: 1.333
  },
  {
    id: 'run',
    name: 'Run',
    zh: '奔跑',
    status: '真实骨骼 · 循环',
    available: true,
    kind: 'clip',
    file: '/models/奔跑.glb',
    loop: true,
    duration: 0.933
  },
  {
    id: 'jump',
    name: 'Jump',
    zh: '跳跃',
    status: '起跳·滞空·落地 · 单次',
    available: true,
    kind: 'clip',
    file: '/models/jump-group.glb',
    loop: false,
    duration: 5.14
  },
  {
    id: 'slide',
    name: 'Slide',
    zh: '滑铲',
    status: '启动·滑行·结束 · 单次',
    available: true,
    kind: 'clip',
    file: '/models/slide.glb',
    loop: false,
    duration: 3.37
  },
  {
    id: 'crouch',
    name: 'Crouch',
    zh: '蹲伏行走',
    status: '真实骨骼 · 循环',
    available: true,
    kind: 'clip',
    file: '/models/crouch-walk.glb',
    loop: true,
    duration: 2.0
  }
];

export const ACTION_FILES = {
  nod: '/models/点头同意.glb',
  dance: '/models/跳舞.glb',
  punch: '/models/直拳.glb',
  roll: '/models/翻滚.glb',
  walk: '/models/走路.glb',
  run: '/models/奔跑.glb',
  jump: '/models/jump-group.glb',
  slide: '/models/slide.glb',
  crouch: '/models/crouch-walk.glb'
};

/**
 * 布景光调：不依赖群核 / SpatialGen 空间资产，直接用灯光、雾与背景
 * 为同一尊醒狮切换观看环境。数值在 scene.js 中落地。
 */
export const STAGE_MOODS = [
  {
    id: 'ink',
    name: '墨夜·聚光',
    english: 'INK NOCTURNE',
    summary: '暖金顶光 · 深红暗场',
    accent: '#c49a5d'
  },
  {
    id: 'moon',
    name: '月白·影棚',
    english: 'MOONLIT STUDIO',
    summary: '冷白柔光 · 中性背景',
    accent: '#c8d3d4'
  },
  {
    id: 'cinnabar',
    name: '朱砂·堂会',
    english: 'CINNABAR HALL',
    summary: '朱红灯笼 · 宴席暖调',
    accent: '#c8503a'
  }
];

/**
 * 观察机位：模型高度 3.25，展台顶部 0.88，
 * 因此狮首大致位于 y ≈ 3.0 – 4.1 的区间。
 */
export const VIEW_PRESETS = [
  {
    id: 'full',
    name: '全景',
    english: 'FULL SHOT',
    position: [9.4, 5.3, 13.2],
    target: [0, 1.85, 0]
  },
  {
    id: 'head',
    name: '狮首',
    english: 'HEAD',
    position: [2.75, 3.7, 5.1],
    target: [0, 2.9, 0]
  },
  {
    id: 'side',
    name: '侧身',
    english: 'PROFILE',
    position: [-8.2, 3.4, 2.4],
    target: [0, 1.95, 0]
  }
];

/**
 * 技术视图：把同一件作品拆成材质、网格与骨架来看。
 * skeleton 需要动作正在播放才有骨骼可显示。
 */
export const VIEW_MODES = [
  { id: 'shaded', name: '材质', english: 'SHADED', hint: '正常的 PBR 材质' },
  { id: 'wireframe', name: '线框', english: 'WIREFRAME', hint: '显露出 197,135 个三角面的布线密度' },
  { id: 'normal', name: '法线', english: 'NORMAL', hint: '用颜色表示朝向，浮雕与转折最清楚' },
  { id: 'skeleton', name: '骨骼', english: 'SKELETON', hint: '需要先播放一段动作' }
];

export const SHOWCASE = {
  modelHeight: 3.25,
  defaultCamera: [9.4, 5.3, 13.2],
  defaultTarget: [0, 1.85, 0],
  exploreStart: [0, 1.72, 12.4],
  exploreBounds: { minX: -15.4, maxX: 39.0, minZ: -18.2, maxZ: 16.5 }
};
