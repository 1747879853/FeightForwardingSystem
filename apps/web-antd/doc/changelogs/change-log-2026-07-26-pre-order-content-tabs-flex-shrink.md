# 业务联系单顶部 content-tabs 防压扁（对齐海运出口）

## 背景意图

编辑页顶部「基础信息」Tab 栏内联样式已与海运出口一致，但在 `pre-order-editor-page` 固定高度 + 下方内容超高时，`.content-tabs` 默认 `flex-shrink: 1` 被压到约 18px，边框/下划线几乎看不见，看起来不像海运出口的 Tab 条。

## 核心逻辑变更

- `editor.vue` 为 `.pre-order-editor-page > .content-tabs` 增加 `flex-shrink: 0` 与 `min-height: 40px`，保证 sticky Tab 条高度稳定（约 50px），与海运出口视觉一致。

## 避坑指南

- 页面用 `height: 100%` + `min-h-0` 做纵向 flex 高度链时，顶部 sticky 工具/Tab 条必须显式 `flex-shrink: 0`，否则会被下方超高内容挤扁。
- Tab 的颜色/下划线仍走与海出相同的内联 `contentTabsStyle` / `getContentTabStyle`；本次只修布局坍缩，不改交互。
