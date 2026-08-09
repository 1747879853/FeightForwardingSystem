# 付费申请金额文案统一为申请/核销口径

## 背景意图

付费申请相关页面混用「结算 / 未结 / 付费审批」等文案，与「申请、核销」业务口径不一致，增加理解成本。本次仅调整展示文案与菜单标题，接口字段名不变。

## 核心逻辑变更

- 菜单/页标题：`auditApproval.paymentReview.title`「付费审批」→「付费申请审批」（路由 path 不变）。
- 费用明细：`settledAmountLabel`「结算金额」→「已核销金额」；`unSettledAmountLabel`（绑定 `unRqstPaymentAmount`）「未结金额」→「可申请金额」。
- 添加费用抽屉：列「未结金额」→「可申请金额」、「本次结算」→「本次申请」；超限/必填校验提示同步。
- 结算币别卡片「已核销」列保持不变（`currencyGroup.settledAmount`）。

## 避坑指南

- `unRqstPaymentAmount` 语义是「未付费申请余额 / 可申请上限」，不是 `unSettledAmount`；勿与结算核销未结字段混用。
- 对账单模块仍使用 `statement.unSettledAmountLabel`（「未结金额」），勿误改 `paymentApplication` 命名空间以外的文案。
- 英文文案：`Written-off Amount` / `Available to Apply`，与中文「已核销金额 / 可申请金额」对应。
