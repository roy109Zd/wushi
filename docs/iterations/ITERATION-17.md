# ITERATION 17 · AI 材质闭环（material-transfer）

- 日期：2026-11-02
- 触发原因：把「上传参考图 → 定制舞狮皮肤」真正跑通。
- 结果：链路打通，生成了第 9 套材质「AI 鎏金」。

---

## 1. 卡了很久的上传，问题在哪

Aholo 的资产上传（OUS）有三个坑：

1. **鉴权头叫 `ous-token-v2`**，不是 `ousToken` / `Bearer`
2. **每次 `GET /asset/v1/token` 都会换新 token**，旧 token 立刻失效——上传和查状态必须用同一个 token
3. **5MB 以上必须分片**：`single/upload` 直接返回 `c:2`，要走 `block/upload/init` + `block/upload/part`

跑通后的流程：

```text
GET  /asset/v1/token                      → ousToken / globalDomain / blockSize
POST {globalDomain}/ous/api/v2/single/upload   （≤5MB，multipart: md5 + file）
POST {globalDomain}/ous/api/v2/block/upload/init?md5&blocks&size&name  （>5MB）
POST {globalDomain}/ous/api/v2/block/upload/part?taskId=…  （逐片）
GET  {globalDomain}/ous/api/v2/upload/status?taskId=…      → url
```

## 2. 材质迁移

- `POST /lux3d/v1/generate/material-transfer/task/create`
- 参数：`{ img, meshUrl, version: "v3.0-standard", outputFormat: ["glb"] }`
- 醒狮模型 15.6MB，分 4 片上传后拿到 `meshUrl`
- 第一次用街景图当参考 → `status 4` 失败（参考图不是材质特写）
- 第二次用 `金属材质.jpg` → 成功，task `4580404`，约 7 分钟
- 产物 13.9MB GLB（PBR 已内嵌）

## 3. 接入

- 存为 `public/models/ai-metal.glb`
- `config.js` 新增 `aiMetal`（09），`MATERIAL_ORDER` 追加，材质档案补一条
- 展项数据、页脚、材质计数同步为 09

## 4. 自己换皮肤

新增 `scripts/material-transfer.mjs` + npm 脚本：

```bash
npm run material -- 你的参考图.png ai-porcelain
```

脚本会自动：上传参考图 → 调材质迁移 → 轮询 → 下载到 `public/models/ai-porcelain.glb`。
之后在 `config.js` 里加一条材质、在 `MATERIAL_ORDER` 里追加即可（自动注册还没做）。

## 5. 已知限制

- **浏览器内直接上传还没接**：需要本地代理保存 Key，不能让 Key 进前端 bundle。
- 材质迁移失败时接口只给 `status 4`，没有原因字段；参考图要是材质特写（布、石、金属表面），不要用场景图。
- 单次约 7 分钟，现场演示要提前生成。

## 6. 涉及文件

| 文件 | 改动 |
|---|---|
| `public/models/ai-metal.glb` | 材质迁移产物（13.9MB） |
| `scripts/material-transfer.mjs` | 新增，完整的上传 + 生成 + 下载脚本 |
| `src/config.js` / `src/dossier.js` | 第 9 套材质与档案 |
| `index.html` / `src/ui.js` | 计数与 AI 面板文案 |
| `package.json` | `npm run material` |
