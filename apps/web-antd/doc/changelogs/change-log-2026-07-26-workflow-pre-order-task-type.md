# 工作流任务类型增加业务联系单（PreOrder=8）

## 背景意图

业务联系单审核依赖 `TaskType.PreOrder = 8`（与 `FrightModule.PreOrder` 同值），但 `/system/workflow/create` 任务类型下拉仍止于付费申请，无法配置联系单审批流。

## 核心逻辑变更

- `workflow-admin.ts`：`TaskType.PreOrder = 8`；`TaskTypeCondition.PreOrderUserId=8001` / `PreOrderOrgID=8002`；`getTaskTypeOptions` 增加「业务联系单」；条件选项按类型返回申请人/组织字段。
- 条件抽屉按 `store.taskType` 切换付费申请 / 业务联系单条件字段（用户 Select / 组织 Select，介词规则与后端一致）。
- `form.vue` 将当前任务类型写入 workflow store；条件文案 `fieldMap` 补 8001/8002。
- `FrightModule.PreOrder = 8` 同步进权限模块枚举与选项，避免模块下拉缺项。

## 避坑指南

- 业务联系单条件**只接受** `8001`（等于/不等于）与 `8002`（属于/不属于），勿自造其它 `TaskTypeCondition`。
- 审批流配置页的 `TaskType` 定义在 `api/system/workflow-admin.ts`，与 `payment-review-admin.ts` 的 `TaskType.PreOrder` 同值但分属两处枚举，改值需两边对齐。
