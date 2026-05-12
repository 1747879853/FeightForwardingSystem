# ExpenseAudit 模块活文档

## 模块定位

- 模块名称：费用审核（提交/修改/删除）管理。
- 业务作用：对订单费用变更动作进行审批，防止未经审批的费用变更直接生效。
- 路由入口：`/audit-approval/expense-review`
- 权限：`Admin.OrderFee.Audit`

## 页面与代码位置

- 审核列表：`apps/web-antd/src/views/audit-approval/expense-all/index.vue`
- 详情面板：`apps/web-antd/src/views/audit-approval/expense-all/modules/detail.vue`
- API：`apps/web-antd/src/api/audit-approval/expense-admin.ts`

## 核心业务对象

- 审核任务：`OrderFeeTaskDto` / `OrderFeeTaskListDto`
- 审核列表项：`OrderFeeAuditListDto`
- 业务单简表：`TransportOrderSimpleDto`
- 批量审核入参：`OrderFeeTaskBatchAuditDto`

## 业务流程

1. 费用录入侧发起提交、修改或删除动作，生成费用审核任务。
2. 审核人员在费用审核列表查看待处理任务。
3. 审核人员可按全量或选中记录执行通过/驳回，并填写审核意见。
4. 审核结果回写任务状态，并反馈到费用状态展示。

## 状态与任务类型

- 任务类型（同系统约定）：
  - 费用提交
  - 费用修改
  - 费用删除
- 审核结果常见状态：
  - 审核中
  - 驳回
  - 通过（或部分通过）

## 关键字段来源线索

- `TransportOrderSimpleDto.accountDate`：按开船日期或创建日期生成月度会计期间。
- `TransportOrderSimpleDto.settlementDate`：按委托单位账期计算应结日期。
- `orderFeeTasks[].orderFee`：绑定费用明细，便于审核上下文展示和比对。

## 与主流程关系

- 上游：订单费用录入模块触发任务。
- 下游：通过后的费用更改进入付费申请、结算、对账等后续链路。
- 约束作用：费用审核是“可申请付费”的重要质量门槛。

## 测试建议

- 覆盖三类任务：提交、修改、删除。
- 覆盖批量动作：全部通过、选中通过、驳回。
- 校验审核意见：为空/有值、长度边界。
- 校验联动：审核结果是否同步回显到费用状态与后续可选费用池。

## 注意事项

- 当前页面支持左侧任务列表 + 右侧详情联动，需重点验证联动定位与刷新行为。
- 如需精确区分“审核通过后驳回”等逆向流程，应结合后端工作流规则补充文档。
