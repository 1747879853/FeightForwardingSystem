# 海运出口编辑页服务项目节点宽度调整

## 背景意图

顶栏内联服务项目 Chevron 流水线节点宽度偏窄（52–88px），服务名称展示空间不足，需拉宽至 96px 以提升可读性。

## 核心逻辑变更

- `form.vue` 中 `.service-pipeline--inline` 下节点固定宽度 `96px`（`flex: 0 0 96px`）。
- 所有流水线节点（含 Tooltip 分支）统一外包 `service-chevron-flow__item`，避免首节点（常为已完成/进行中态）因 Tooltip 根节点非 `span` 导致宽度样式未命中。
- 首节点 `.chevron-step--first` 显式 `margin-left: 0`，避免被通用负边距左移裁切。

## 避坑指南

- 宽度样式仅挂在 `.service-pipeline--inline` 下，勿改全局 `.service-chevron-flow`（`72–140px`）以免影响其他潜在复用场景。
