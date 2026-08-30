# 打开检索抽屉时卸掉 Tab canvas

## 背景意图

`page-container` / `root-portal` / `z-index` 都压不住微信 2d canvas。产品确认：打开抽屉时把 canvas 卸掉即可。

## 核心逻辑变更

- `skew-tabs` 增加 `hidden`。为 true 时 `v-if` 卸掉 canvas 并清掉绘制状态。
- 列表把 `searchVisible` 传给 `hidden`。关掉抽屉后再 `nextTick` 挂回、重绘。
- 检索抽屉仍用原来的 `wd-popup`（右侧、`root-portal`），不改成 `page-container`。

## 避坑指南

- 只设 `display: none` 不够，原生层可能还在，必须 `v-if` 卸节点。
