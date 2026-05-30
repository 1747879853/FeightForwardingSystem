# 工作台审核 Tab 复用搜索表单并接入业务列表

## 背景意图

`/workspace` 页面中“应收应付审核”“付费申请审核”此前仅为占位提示，无法在工作台内直接查看审核任务。业务期望这两个 Tab 与“海运出口服务”保持统一的顶部查询体验，并在下方直接呈现业务列表，减少页面切换成本。

## 核心逻辑变更

1. `src/views/dashboard/workspace/index.vue` 新增审核 Tab 的列表化渲染分支：
   - 复用海运出口搜索区的视觉样式，但改为审核专用筛选组件 `WorkbenchReviewFilterBar`；
   - 在审核 Tab 下渲染 `WorkbenchBusinessTable`，不再展示“暂未对接”占位文案。
2. 接入审核数据源并映射为统一业务列表结构：
   - 应收应付审核：调用 `getOrderFeeTaskList`，查询参数改为接口口径的 `Processed + Remark`，并映射为工作台业务行；
   - 付费申请审核：调用 `getPayAppTaskList`，查询参数使用接口支持的 `Keyword / ApplicationNo / SettlementId / CurrencyId / SubmitTimeStart-End / CreatorUserId / AuditUserId`；
   - 顶部“处理中/已处理”对付费审核按 `TaskStatus.Auditing` 做前端分流显示。
3. 审核 Tab 的行跳转行为接入：
   - 应收应付审核行跳转到费用审核详情路由；
   - 付费申请审核行跳转到付款申请审核页面。
4. `workbench-business-table.vue` 新增 `enableTaskActions` 开关：
   - 审核 Tab 下关闭海运任务专属批量动作与勾选列，只保留“刷新”；
   - 避免误调用海运任务转交/完成接口。

## 避坑指南

- 审核 Tab 已拆分独立筛选模型，后续新增字段时请严格先核对审核接口 DTO，可查 `expense-admin.ts` 与 `payment-review-admin.ts`，避免把海运出口字段直接复用进审核查询。
- `WorkbenchBusinessTable` 默认仍是“可批量操作”模式；新增场景若不是海运任务流，务必显式传入 `:enable-task-actions="false"`。
- 付费申请审核当前以 `taskStatus === Auditing` 归类为“处理中”，其余状态归入“已处理”，若后端状态枚举扩展需同步校准映射规则。
