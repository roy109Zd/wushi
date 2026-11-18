/**
 * 材质档案：给八套材质各配一份可读的「展签」。
 * 与 MATERIALS 分开维护，避免 config 变成大杂烩；
 * params 只用于界面上的参数条，不参与实际渲染。
 */
export const MATERIAL_DOSSIERS = {
  original: {
    craft: 'AI 生成素模 · 单件黏土雕刻',
    story: '所有材质共用的一副骨架：狮首的卷毛、额头的祥云、衣襟的盘扣都先在这里成形。中性灰让观看退回形体本身。',
    palette: ['#e7e2d8', '#a8a29a', '#5f5b56'],
    params: { metalness: 0.02, roughness: 0.92 },
    mood: 'moon',
    tags: ['素模', '形体', '浮雕']
  },
  metal: {
    craft: '失蜡法铜胎 · 手工鎏金',
    story: '金层不是均匀涂层，而是在凹陷处沉积得更深，于是鬃毛的卷曲被高光一段段读出来。它更像一件被长期摩挲的器物。',
    palette: ['#f1dca2', '#a87435', '#5b3219'],
    params: { metalness: 0.95, roughness: 0.28 },
    mood: 'ink',
    tags: ['金属', '高光', '器物']
  },
  ceramic: {
    craft: '陶胎 · 低温铅釉 · 窑变',
    story: '朱红、青绿与蜜黄在釉面里互相渗开，像庙会戏台的颜色被收进一只瓶子。釉光柔和、边缘略暗，是最「民俗」的一版。',
    palette: ['#c8503a', '#2e7564', '#e0b25c'],
    params: { metalness: 0.05, roughness: 0.22 },
    mood: 'cinnabar',
    tags: ['釉面', '民俗', '暖色']
  },
  marble: {
    craft: '整石雕刻 · 细砂打磨',
    story: '把柔软的鬃毛交给石头，反差本身就是叙事：重量、密度、不可修改。灰白纹理从肩头斜切到衣摆。',
    palette: ['#f2f0ea', '#c9c5bc', '#8b877f'],
    params: { metalness: 0.02, roughness: 0.45 },
    mood: 'moon',
    tags: ['石雕', '重量', '纹理']
  },
  glass: {
    craft: '失蜡铸造 · 光学级玻璃',
    story: '形体被抽成一层折射壳，暖光穿过狮头在台面上留下彩色焦散。它介于雕塑与灯具之间。',
    palette: ['#cfe6e2', '#8fb8b2', '#e6c79a'],
    params: { metalness: 0, roughness: 0.05, transmission: 0.92 },
    mood: 'ink',
    tags: ['透明', '折射', '光影']
  },
  coloredGlass: {
    craft: '彩色玻璃镶嵌 · 铅条拼接',
    story: '把醒狮拆成一块块彩色玻璃，再沿轮廓拼回去，像一扇被立起来的东方花窗。',
    palette: ['#a9322c', '#245f62', '#e1b85b'],
    params: { metalness: 0.1, roughness: 0.12, transmission: 0.6 },
    mood: 'cinnabar',
    tags: ['拼色', '花窗', '透光']
  },
  whitePorcelain: {
    craft: '高岭土 · 1300℃ 还原焰',
    story: '釉层极薄，所有细节只能靠形体的转折与微弱高光交代。克制到几乎没有颜色，反而最考验造型。',
    palette: ['#fffdf7', '#eee5d7', '#c9bda9'],
    params: { metalness: 0, roughness: 0.15 },
    mood: 'moon',
    tags: ['白釉', '克制', '器韵']
  },
  felt: {
    craft: '湿毡工艺 · 手工戳刺',
    story: '纤维把硬边全部磨圆，狮头看起来像可以抱在怀里的玩偶。它把「图腾」拉回到玩具的尺度。',
    palette: ['#e0b07d', '#b16c48', '#5b3021'],
    params: { metalness: 0, roughness: 0.98 },
    mood: 'cinnabar',
    tags: ['纤维', '柔软', '潮玩']
  },
  aiMetal: {
    craft: 'Lux3D 材质迁移 · 参考图 → PBR',
    story: '不是预设，也不是手调：一张金属参考图经材质迁移直接生成整套 PBR 贴图，再贴回同一副骨架。它证明「皮肤」可以是现场做出来的。',
    palette: ['#f1dca2', '#a87435', '#3a2416'],
    params: { metalness: 0.92, roughness: 0.26 },
    mood: 'ink',
    tags: ['AI', '材质迁移', '现场生成']
  }
};
