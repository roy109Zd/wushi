# ITERATION 24 · 第二个传送门：SpatialGen 3DGS 街景

- 日期：2026-11-02
- 目标：保留原有「传送至街市」，新增一个直接进入 SpatialGen 3DGS 空间的入口。
- 结果：入口已加，**并且定位到了此前一直进不去的真正原因**。

---

## 1. 真正的阻塞点

之前 3DGS 打开一直超时/黑屏，不是性能问题，而是格式不兼容：

```text
[SPZ ERROR] deserializePackedGaussians: version not supported: 3
TypeError: Cannot read properties of null (reading 'shDegree')
```

`street.spz` 是 **SPZ v3**，而 `@mkkellogg/gaussian-splats-3d@0.4.7`（当前最新）只支持到 v2，
所以解析直接失败，随后 90 秒超时才报错——看起来像「加载很慢」。

## 2. 处理

- 从 World 详情里取 **`.ply` 原文件**（32.4MB，500,114 个泼溅），改用 PLY 路径加载；
- `SplatStreet` 场景地址改为 `/models/street.ply`；
- 超时从 20 秒放宽到 90 秒，加载层带秒数进度；
- 失败时明确提示「当前设备可能不支持高斯泼溅渲染」。

## 3. 入口

右侧 PORTAL 区现在有两个按钮：

1. **传送至街市** —— 程序化街市，进入 Roam，可走动；
2. **SpatialGen 街景（3DGS）** —— 打开泼溅查看器，拖动旋转、滚轮缩放，左上角「返回展厅」。

## 4. 实测

- 无头浏览器（纯 CPU）：**10–14 秒加载完成**，控制台输出 `[SplatStreet] ready in 12851ms`；
- canvas 尺寸 1566×769，加载层正常收起；
- **但画面仍是黑的**：相机取景与泼溅尺度（包围盒 x ±151、y -110..96、z -79..151）还没调对，
  或者软件渲染下 50 万泼溅不可见。

## 5. 下一步

1. 先在真实浏览器点一次，确认是否同样是黑屏；
2. 若黑屏：改用 **panoUrl 全景图**（1.1MB）做保底查看器，秒开且必有画面；
3. 若正常：只需微调 `initialCameraPosition` 与 `initialCameraLookAt`。
