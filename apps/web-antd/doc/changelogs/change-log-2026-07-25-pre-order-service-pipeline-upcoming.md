---
title: 业务联系单服务项流水线改为未执行样式
date: 2026-07-25
module: pre-order
---

# 背景意图

业务联系单顶部服务项目 chevron 误用了海运出口的任务态默认 `done`（绿底勾选 = 已完成），联系单侧并无服务任务进度，展示成「已完成」会误导用户。

# 核心逻辑变更

1. `service-panel.vue` 的 `nodeState`：已勾选节点默认 `upcoming`（灰底未执行）；仅出口对比「新增」用 `active`。
2. 图标同步：去掉默认 `mdi:check-circle`，「新增」用进度钟，其余用 `mdi:schedule`。

# 避坑指南

- 联系单流水线只表示「勾选了哪些主流程服务」，不要复用海出 `getServicePipelineState`（依赖 `taskStatus` / activeSortId）。
- 对比「删除」保持 upcoming 淡化即可，不必再单独分支。
