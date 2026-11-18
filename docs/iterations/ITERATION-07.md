# ITERATION 07 · 用 Lux3D 生成醒狮鼓

- 日期：2026-11-02
- 触发原因：拿到 Lux3D API Key，希望用真实生成能力补一点内容。
- 本轮目标：只花一次生成任务，给展厅加一件和主题强相关的道具。

---

## 1. 接口与一次调用

- 端点：`https://api.aholo3d.cn`（国内区）
- 鉴权：`Authorization: <API Key>`，Key 从 `api.txt` 读取，未写入代码、未打印
- 先用免费的 `GET /lux3d/v1/generate/task/list` 验证 Key 可用
- 再提交 **1 个** `text-to-3d` 任务：

```json
{
  "prompt": "A traditional Chinese lion dance drum: red lacquered wooden barrel with brass tacks, painted lion face, dark wooden frame...",
  "version": "G1-Turbo",
  "outputFormat": ["glb"],
  "enablePbr": true
}
```

- 任务 ID：`4564027`
- 约 80 秒完成，产出带 PBR 贴图的 GLB（21MB，1 mesh，无动画）
- 下载后存为 `public/models/drum.glb`

> 只用了这一次生成任务；`list` 不计费。没有做第二次试错，避免浪费额度。

## 2. 接入方式

新增 `src/environment/drum-ornament.js`：

- 首屏 3.2 秒后延迟加载
- 按高度归一化到 1.5 单位，底面贴地
- 摆在展台左前方 `(-4.25, 0, 1.55)`，朝展台方向转 0.55 rad
- 开启投影与接收阴影，环境反射 0.75
- 在 `procedural-hall.js` 里注册，并补了一个半径 0.9 的圆形碰撞体，第一人称漫游不会穿过去

## 3. 涉及文件

| 文件 | 改动 |
|---|---|
| `public/models/drum.glb` | Lux3D 生成产物（21MB） |
| `src/environment/drum-ornament.js` | 新增，加载 / 归一化 / 摆放 / 释放 |
| `src/environment/procedural-hall.js` | 接入鼓、补碰撞体、随展厅释放 |

## 4. 验证

- `npm run build` 通过；
- 未跑浏览器实测，建议确认：鼓是否落在展台左前方、比例是否合适、是否挡住角色、第一人称是否能撞到。

## 5. 安全提醒

**`api.txt` 现在放在项目根目录，Vite 开发服务器会把它当静态文件暴露（`/api.txt`）。** 建议：

- 移到项目外的目录，或加入 `.gitignore` 并删除工作区副本；
- 不要把 Key 写进 `VITE_*` 环境变量或前端代码；
- 这次调用只在本地脚本里读文件、放进请求头，未写入任何源码或文档。

## 6. 下一轮

- 用同一套接口做**材质迁移**（需要先解决模型/参考图的公网 URL）；
- 若鼓的观感一般，可再花一次任务换 prompt（例如只要鼓身、不要架子）。
