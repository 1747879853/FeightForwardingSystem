# 工作流任务类型下拉移除「费用删除」

## 背景意图

`/system/workflow/create`（及共用表单的编辑页）任务类型下拉不再提供「费用删除」，避免新建/配置该类审批流。

## 核心逻辑变更

- `getTaskTypeOptions()`：去掉 `{ label: '费用删除', value: TaskType.DeleteOrderFee }`。
- `getTaskTypeConditionOptions()`：删除 `TaskType.DeleteOrderFee` 分支。
- `TaskType.DeleteOrderFee = 2` 与 `TaskTypeCondition.DeleteOrderFee = 2000` 枚举值保留，兼容后端与历史数据。

## 避坑指南

- 列表筛选、展示若仍可能遇到历史「费用删除」工作流，勿从枚举中删除该值，仅从可选下拉中隐藏即可。
