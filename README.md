# Material Magician · 东方醒狮数字展厅

一个以中国传统南狮为主题的互动 3D 展厅。主角是一尊 Q 版「小狮童·阿醒」，
在同一副骨架上呈现 9 套材质、9 段真实骨骼动作，并配有布景光调、部位热点、
舞狮故事与练功房、第三人称漫游，以及门外的长安街市（含 SpatialGen 生成的 3DGS 场景）。

技术栈：Vite + Three.js 0.180 + 原生 HTML/CSS/JS；生成能力来自 Aholo Lux3D 与 SpatialGen。

---

## 功能一览

| 模块 | 内容 |
|---|---|
| 材质 | 9 套（素模、鎏金、彩釉、大理石、玻璃、彩璃、白瓷、毛毡、AI 鎏金），按需加载、LRU 缓存 2 套 |
| 动作 | 9 段真实骨骼动画：跳跃（起跳·滞空·落地）、滑铲（启动·滑行·结束）、蹲伏行走，以及点头/跳舞/直拳/翻滚/走路/奔跑，可与任意材质组合 |
| 布景 | 墨夜·聚光 / 月白·影棚 / 朱砂·堂会，三套光调实时切换 |
| 机位 | 全景 / 狮首 / 侧身，加上自由轨道与复位 |
| 技术视图 | 材质 / 线框 / 法线 / 骨骼 |
| 叙事 | 五处部位热点、五章舞狮故事、四章练功房，均可点击推近并读说明 |
| 漫游 | Roam 模式：W/S 前后、A/D 转身、Shift 奔跑、空格跳跃；第三人称跟随、碰撞 |
| 空间 | 38×42×10 展厅、两个侧室、壁龛、盘龙、宫灯、鼓、香炉 |
| 街市 | 推门进入长安小街，三个独立行人；越门后接入 SpatialGen 3DGS 街景 |
| AI | 参考图 → Lux3D 材质迁移 → 新皮肤（命令行 `npm run material`） |

---

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 生成新皮肤

```bash
npm run material -- assets/references/青铜.png ai-bronze
```

脚本会：上传参考图 → 首次运行时自动分片上传醒狮模型（缓存 6 小时）→
调用 `material-transfer` → 轮询 → 下载到 `public/models/ai-bronze.glb`。

之后在 `src/config.js` 的 `MATERIALS` 增加条目、在 `MATERIAL_ORDER` 追加 key 即可上展台。

---

## 目录结构

```
.
├─ index.html                 页面骨架
├─ src/
│  ├─ main.js                 总装与交互编排
│  ├─ config.js               材质 / 动作 / 布景 / 机位 / 视图模式
│  ├─ scene.js                渲染器、灯光、三套光调
│  ├─ model-manager.js        GLB 加载、归一化、缓存、材质保护
│  ├─ action-theater.js       骨骼动作、原地化、材质借用
│  ├─ camera-controls.js      轨道 / 机位 / 第一人称 / 补间
│  ├─ roam.js                 第三人称角色漫游
│  ├─ hotspot-tour.js         部位热点与说明卡
│  ├─ splat-street.js         SpatialGen 3DGS 查看器
│  ├─ story.js / training.js  故事与练功文案
│  ├─ dossier.js              九套材质档案
│  └─ environment/            展厅、街市、摆件、故事长廊、练功房
├─ public/models/             运行时 GLB / 3DGS 资产
├─ assets/references/         材质参考图（不参与构建）
├─ docs/
│  ├─ iterations/             17 轮迭代记录
│  └─ prompts/                建模提示词
├─ scripts/material-transfer.mjs
├─ report/                    课程报告（LaTeX）
├─ .secrets/                  本地密钥（已 gitignore）
└─ README.md
```

---

## 资产说明

| 资产 | 来源 |
|---|---|
| 8 套材质 GLB、3 段基础动作 | 项目原有 |
| 点头 / 跳舞 / 翻滚 / 直拳 | 用户补充 |
| 龙 | 用户补充 |
| 鼓 / 香炉 / 宫灯 | Lux3D `text-to-3d` 生成（3 次任务） |
| 街景 3DGS | SpatialGen `world/v1/generations` 生成（1 次任务） |
| AI 鎏金 | Lux3D `material-transfer` 生成（1 次任务） |
| 展厅、街市、屏风、壁龛、故事长廊、练功房、行人 | 程序化几何 |

---

## 已知限制

1. 群核 / SpatialGen 的整场景 GLB 仍未打通，街市先用程序化几何 + 一条 3DGS 街景兜底。
2. 材质迁移在浏览器内直接上传尚未实现（需要本地代理保存 Key）。
3. 7 段动作各自带一份完整角色，动作文件共约 200MB，尚未合并。
4. 3DGS 街景是「看」不是「走」，未与碰撞/角色移动结合。
5. 材质迁移失败时接口只返回 `status 4`，不提供原因。

---

## 文档索引

- 项目总览与路线：[PROJECT_SUMMARY_AND_ROADMAP.md](PROJECT_SUMMARY_AND_ROADMAP.md)
- 每轮迭代记录：[docs/iterations/](docs/iterations/)
- 课程报告源码：[report/main.tex](report/main.tex)

## 密钥

API Key 放在 `.secrets/api.txt`，只由本地脚本读取，不进入前端 bundle，也不提交到版本库。
