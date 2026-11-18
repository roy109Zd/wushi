# ITERATION 14 · 用 SpatialGen（World API）生成街景

- 日期：2026-11-02
- 触发原因：程序化街市太简陋，用户要求直接用 SpatialGen 生成。
- 结论：找到了真正的 SpatialGen 接口并成功生成，接入为门外街景。

---

## 1. 找到接口

Aholo OpenAPI 文档：`https://labs.aholo3d.cn/api-docs/openapi.json`

其中 `World` 标签就是 SpatialGen：

| 接口 | 用途 |
|---|---|
| `POST /world/v1/generations` | 提交 3DGS 场景生成（Spatial Gen） |
| `GET /world/v1/{worldId}` | 查询进度与产物 |
| `POST /world/v1/list` | 我的场景列表 |

用现有 Key 验证通过（列表接口返回 200）。

## 2. 生成

第一次带图片 URL 被拒（`文件链接不可用，请使用资产模块上传`），但接口的 `resources` 不是必填，于是改为纯文本提示词：

```json
{ "name": "长安街市", "prompt": "唐代长安街市：木构店铺沿街排开，青瓦屋顶，檐下红灯笼，夯土路面，远处城门，午后暖光，第一人称可行走" }
```

- `worldId`：`3FO4K4RJ1HA6`
- 约 16 分钟完成（PREPROCESSING → RUNNING → SUCCEEDED）
- 产物：3DGS splat
  - `.ply` 原始
  - `.spz` 压缩（**7.9MB**，实际使用）
  - LOD 元数据、全景图
- `upAxis: Z`

## 3. 接入

- 存为 `public/models/street.spz`
- 安装 `@mkkellogg/gaussian-splats-3d`（npmmirror）
- 新增 `src/splat-street.js`：用该库独立的 Viewer 渲染，避免和主场景 PBR 管线冲突
- 触发：角色漫游时走过右门（x > 20.9），退出漫游、打开全屏 3DGS 街景；左上角「返回展厅」关闭

原来的程序化街市仍保留在门外，作为"物理街市"；SpatialGen 场景作为推门后的"另一进空间"。

## 4. 涉及文件

| 文件 | 改动 |
|---|---|
| `public/models/street.spz` | SpatialGen 产物（7.9MB） |
| `src/splat-street.js` | 新增，3DGS 查看器封装 |
| `src/main.js` | 越门触发、返回、销毁 |
| `index.html` / `src/style.css` | 全屏街景层与返回按钮 |
| `package.json` | 新增高斯泼溅渲染依赖 |

## 5. 验证与风险

- `npm run build` 通过（bundle 因引入 splat 库变大）；
- 未跑浏览器实测，重点确认：
  1. 走过门后是否正常打开街景、能否拖动/缩放；
  2. 3DGS 的朝向与尺度（`cameraUp: [0,0,1]`、初始机位是估的）是否合理；
  3. 「返回展厅」后能否继续漫游；
  4. 移动端性能（7.9MB splat 对低端机偏重）。

## 6. 后续

- 按实际观感调 `initialCameraPosition` / `initialCameraLookAt` 与缩放；
- 可以把门做成"传送点"，让角色继续在 3DGS 里走动（需要把 splat 与碰撞结合，工作量大）；
- 用 World API 再生成一版带参考图的街景，质量通常更高。
