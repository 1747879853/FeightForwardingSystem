# TAPD #1001034 应收应付审核：负利润备注挪到提醒右侧

## 背景意图

[TAPD #1001034](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001001034)：负利润备注原先落在任务列表「备注」列（业务信息区），审核时不直观、易漏看。要求移到费用明细标题栏「提醒」右侧，并明确标记为「负利润备注」。

## 核心逻辑变更

- 任务列表去掉通用「备注」列。
- 选中任务后，费用明细卡片标题在 `OrderFeeWarningTicker` 右侧展示「负利润备注」胶囊（有内容才显示，悬停看全文）。
- 独立详情路由自行拉取 `OrderFeeTaskDetailAsync.remark`。

## 涉及文件

- `views/audit-approval/data.ts`
- `views/audit-approval/expense-all/index.vue`
- `views/audit-approval/expense-all/modules/detail.vue`
- `locales/langs/zh-CN/auditApproval.json`
