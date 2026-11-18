# 群核 / SpatialGen 空间接入

## 推荐交付格式

请优先提供：

1. 单文件 **GLB**；
2. 纹理内嵌；
3. Y 轴向上；
4. 单位保持一致，最好在文件名或说明中标注实际尺寸；
5. 提供空间朝向、入口位置和中央展台中心点。

推荐文件结构：

```text
public/spatialgen/
  hall.glb
  manifest.json
```

## manifest.json

复制 `manifest.example.json` 为 `manifest.json`，并确认 `scene` 指向实际 GLB。

- `stageTop`：中央醒狮模型底部所在的 Y 高度。模型包含抬高的展台时需填写。
- `autoFit`：是否自动缩放至约 24 × 24 单位和 8.5 单位高度。
- `transform`：模型原始坐标需要校正时使用。
- `colliders`：自由探索碰撞体，可配置圆形或矩形。
- 未提供 `colliders` 时只生成中央展台碰撞和空间外边界。

矩形碰撞体示例：

```json
{ "type": "box", "minX": -3, "maxX": 3, "minZ": -8, "maxZ": -6 }
```

## 两种使用方式

### 1. 页面内直接导入

打开“空间实验”，选择单个 GLB。适合快速验收，不会上传到服务器，刷新后需要重新导入。

### 2. 固定项目资产

将 GLB 和 manifest 放入上述目录，并设置：

```env
VITE_SPATIALGEN_MANIFEST_URL=/spatialgen/manifest.json
```

或访问：

```text
http://localhost:5173/?spatialgen=/spatialgen/manifest.json
```

## 群核导出注意事项

- 如果导出的是 `.gltf + .bin + 多张贴图`，请先在 Blender 或其他 DCC 工具中合并为单个 GLB。
- 不建议导出超大 Lightmap、烘焙贴图或重复家具网格。
- 建议把不可见墙体、天花板背面和无关软装清理掉，以保证自由探索帧率。
