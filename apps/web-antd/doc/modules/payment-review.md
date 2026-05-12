# PaymentReview 模块活文档

## 模块定位

- 模块名称：付费审核管理。
- 业务作用：对付费申请单执行审核通过/驳回，驱动申请状态与后续结算进度。
- 路由入口：`/audit-approval/payment-review`
- 权限：`Admin.PaymentApplication.Audit`

## 页面与代码位置

- 页面：`apps/web-antd/src/views/audit-approval/payment-review/index.vue`
- API：`apps/web-antd/src/api/audit-approval/payment-review-admin.ts`

## 核心业务对象

- 审核任务项：`PayAppTaskItemDto`
- 审核动作入参：
  - `TaskItemAuditDto`（通过）
  - `TaskItemRejectAuditDto`（驳回）
- 工作流详情：`WorkFlowInstanceDetailDto`

## 任务状态与流程

- `TaskStatus`：
  - `Auditing`（审核中）
  - `Rejected`（已驳回）
  - `Passed`（已通过）
  - `PartialPassed`（部分通过）
- 页面支持对“全量数据”或“勾选数据”执行批量审核操作。

## 业务流程

1. 审核人进入付费审核列表，按申请编号、结算对象、币别、时间区间等筛选。
2. 选择待审记录，填写审核意见。
3. 执行通过或驳回，前端调用：
   - `PaymentApplicationAdmin/AuditAsync`
   - `PaymentApplicationAdmin/RejectAsync`
4. 列表刷新，展示最新审核状态。

## 与工作流关系

- 支持读取工作流实例详情（`WorkFlowInstanceAdmin/GetAsync`）查看节点审批情况。
- 任务对象内包含 `taskItemWorkFlowInstance`，可用于前端时间线展示。

## 与主流程关系

- 上游：付费申请模块提交后的审核任务。
- 下游：申请单状态推进到通过/驳回/部分通过，影响结算执行节奏。
- 风险点：批量审核操作需严格验证选中范围，避免误操作。

## 测试建议

- 列表筛选：时间区间、组织、申请号、状态组合验证。
- 审核动作：全通过、选中通过、全驳回、选中驳回。
- 备注校验：空值、超长、特殊字符。
- 数据一致性：审核结果与申请单详情状态同步。
- 权限校验：无审核权限用户不可操作。

## 注意事项

- 当前页面以批量处理为主，测试需重点验证“当前页全部数据”与“勾选数据”动作差异。
- 若出现跨页批量需求，需要额外确认产品口径与实现策略（当前以表格当前数据集为主）。
