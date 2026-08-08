# 工作流任务类型「费用修改」改名为「费用变更」

## 背景意图

工作流新建/编辑页任务类型展示文案与业务用语对齐，将「费用修改」改为「费用变更」。

## 核心逻辑变更

- `getTaskTypeOptions()`：`ModifyOrderFee` 的 label 改为「费用变更」。
- `getTaskTypeConditionOptions()`：同类型条件字段 label 同步改为「费用变更」。
- 枚举值 `TaskType.ModifyOrderFee = 1` 不变。

## 避坑指南

- 仅前端展示名变更；接口与存库仍为 `taskType=1`，勿改枚举数值。
