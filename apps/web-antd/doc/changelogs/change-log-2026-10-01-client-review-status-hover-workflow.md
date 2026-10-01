# 客户审核状态列改为悬停显示审核流程

## 改动

`ClientStatusCell` 的审批流程 Popover 由 `click` 改为 `hover`（延迟 0.2s），与提单审核批次状态、提成审核状态列一致；整单已通过仍仅 Tooltip。

## 影响范围

客户审核列表「客户状态」列。
