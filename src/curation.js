export const CURATION_CHAPTERS = [
  {
    id: 'origin',
    number: '01',
    label: '源起',
    kicker: 'ORIGIN / 源起',
    title: '南狮为魂，孩童为形',
    body: '主角不是一尊静止的狮子，而是一位戴南狮狮头、正在起势的小狮童。孩童比例让传统图腾变得亲近，也让“传承”有了可以被看见的年轻主体。',
    cue: '建议讲述：为什么选择“小狮童”，而不是写实舞狮演员。',
    focus: 'story'
  },
  {
    id: 'form',
    number: '02',
    label: '形塑',
    kicker: 'FORM / 形塑',
    title: '一体千纹，先有形而后有相',
    body: '角色以单一高精度网格构成，保留狮首五官、卷曲鬃毛、祥云浮雕、盘扣与衣褶。约 19.7 万三角面支撑近景观察，但所有材质版本共享同一副骨架。',
    cue: '建议演示：拖动旋转并放大，观察狮头与服装浮雕。',
    focus: 'facts'
  },
  {
    id: 'material',
    number: '03',
    label: '赋材',
    kicker: 'MATERIAL / 赋材',
    title: '同形八相，材质成为叙事语言',
    body: '八种材质共享同一副形体：素模、鎏金、彩釉、大理石、澄明玻璃、彩璃、白瓷与羊毛毡。它们不是简单换色，而是对同一文化符号的不同解释——未完成的雕塑、被打磨的金器、承载民俗色彩的釉面，以及更接近潮玩手办的柔软纤维。',
    cue: '建议演示：连续切换材质，保持同一机位观察高光与反射变化。',
    focus: 'material'
  },
  {
    id: 'stage',
    number: '04',
    label: '布景',
    kicker: 'STAGE / 布景',
    title: '同一尊狮，三种观看环境',
    body: '群核空间资产尚未到位，展厅先用灯光、雾与背景完成叙事：墨夜聚光让鎏金更锋利，月白影棚让素模的浮雕更清楚，朱砂堂会则把彩釉拉回民俗现场。',
    cue: '建议演示：在“布景光调”里连续切换三套光调，观察同一材质在不同环境中的气质变化。',
    focus: 'stage'
  },
  {
    id: 'motion',
    number: '05',
    label: '动势',
    kicker: 'MOTION / 动势',
    title: '让数字雕塑重新获得身体',
    body: '点头、跳舞、直拳、翻滚、走路、奔跑、跳跃共七段真实 Mixamo 骨骼动画，含蒙皮与 23–53 条动画通道。它们不是摄像机动效，也不是伪造的模型位移，而是角色骨架真正发生的动作；动作会沿用当前所选材质。',
    cue: '建议演示：播放 Walk 或 Run，再切换材质，说明动作与材质资产相互独立。',
    focus: 'motion'
  },
  {
    id: 'cocreate',
    number: '06',
    label: '共创',
    kicker: 'CO-CREATE / 共创',
    title: '从观众到材质共创者',
    body: 'AI 材质入口把参考图与文字描述转化为未来可调用的材质任务。前端只收集意图与预览，真正的 PBR 纹理迁移交给 Lux3D 后端，避免在前端暴露 API Key。',
    cue: '建议演示：上传一张材质参考图，说明后续接入 Lux3D 的任务链路。',
    focus: 'ai'
  }
];

export function getCurationChapter(id) {
  return CURATION_CHAPTERS.find((chapter) => chapter.id === id) || CURATION_CHAPTERS[0];
}
