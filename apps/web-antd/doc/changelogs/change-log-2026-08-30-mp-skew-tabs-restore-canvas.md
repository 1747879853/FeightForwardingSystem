# 监装列表斜切 Tab 恢复 Canvas 方案

## 背景意图

普通 view / PNG 还原不了原来的 S 线滑动。产品要求仍用最初的 `canvas type="2d"` 斜切滑块。

## 核心逻辑变更

- `skew-tabs` 恢复 Canvas 绘制：浅蓝底、`#f9fafd` 贝塞尔滑块、`fillText` 文案、点击插值动画。
- 检索抽屉改为页面级 `page-container`（右侧假页，`z-index: 30000`），用来盖住原生 canvas；不再卸 canvas，也不再用 `root-portal`。

## 避坑指南

- 普通 `z-index` 和 `root-portal` 盖不住这块 canvas。抽屉必须用 `page-container` 这种假页。
- canvas 上的字仍要 `fillText`，上层 view 只做热区。
