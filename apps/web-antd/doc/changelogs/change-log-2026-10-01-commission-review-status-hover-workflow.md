# 提成审核：悬停状态列查看审批流程

## 改动

- 去掉工具栏「审批流程」按钮。
- 「状态」列改为 `CommissionStatusCell`：悬停标签弹出审核流程（`WorkflowTimeline`），并展示「我的审核状态」；任务已整单通过时仅 Tooltip，不再拉流程。
- 交互对齐客户审核状态列浮层（触发改为 hover）。

## 影响范围

`/audit-approval/commission-review`。
