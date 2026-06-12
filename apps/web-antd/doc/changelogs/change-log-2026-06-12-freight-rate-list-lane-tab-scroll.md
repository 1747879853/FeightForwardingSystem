# 运价列表航线 Tab 靠左展示与横向滚动

## 背景意图

运价列表顶部需按航线快速筛选；航线数量较多时，原工具栏布局会导致 Tab 显示不全、与右侧操作按钮互相挤压，且缺少明确的横向浏览方式。

## 核心逻辑变更

- 航线 Tab 移至 VxeGrid `toolbar-actions` 左侧区域，操作按钮保留在 `toolbar-tools` 右侧。
- Tab 容器采用「外层滚动 + 内层 `max-content` 轨道」结构，避免 flex 子项被压缩导致 Tab 看似未渲染。
- 超出可视宽度时显示左右滚动按钮；点击后通过 rAF + easeOutCubic 平滑滚动，动画期间仅更新 DOM `scrollLeft`，结束后再同步按钮可用状态。
- 工具栏 CSS 约束左侧区域 `min-width: 0` 且与右侧按钮保持 120px 间距，防止 Tab 撑开挤占操作区。

## 避坑指南

1. **Flex 子项默认会 shrink**：Tab 项必须 `flex-shrink: 0`，轨道使用 `width: max-content`，否则多 Tab 会被压扁且无法滚动。
2. **滚动动画期间勿频繁改 Vue 状态**：若在 smooth/rAF 滚动每一帧更新 `:disabled`，会触发整段工具栏重渲染导致卡顿；仅在动画结束或用户手动滚动停止后更新。
3. **滚动容器需 `width: 0` + `flex: 1`**：否则 `max-content` 子节点会把工具栏撑宽，右侧按钮被挤出视口。
