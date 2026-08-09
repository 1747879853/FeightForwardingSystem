# 2026-08-09 收费核销明细展示同一流水下全部核销明细

## 背景意图

同一张银行流水可以被多个人、多张核销单分别核销（例：流水 `0029` 下 `RCS26080004/05` 由「超级管理员」创建、`RCS26080006` 由「云东商务」创建）。此前收费核销编辑页的「结算明细」只渲染 `ReceiveSettlementAdmin/DetailAsync` 返回的本单明细，用户无法看到这笔流水已经被谁核销掉多少，只能靠「已结算（不含本单）」一个汇总数字倒推。需求：明细表要显示流水下所有核销明细（含他人创建的），但只有本单明细可编辑。

## 核心逻辑变更

- `BankStatementDetailDto` 补 `receiveSettlements`（新增 `BankStatementReceiveSettlementDto`，含 `receiveSettlementItems` / `receiveSettlementInvoiceItems` 两类明细子表）。这是同一流水下全部核销明细的唯一来源，`GetReceiveSettlementPagedListAsync` 只有汇总没有明细。
- `form.vue` / `invoice-form.vue` 新增 `foreignItems` computed：从 `bankStatementDetail.receiveSettlements` 中剔除当前 `editId`，摊平两类明细子表映射成行；表格数据源改为 `tableItems = [...items, ...foreignItems]`。
- 行上加 `_isCurrent` / `_settlementNo` / `_creatorUserName`；新增「核销单号」「创建人」两列，本单行打「本单」Tag，他单行灰底只读（`settlement-row--foreign`）。
- 只读收敛：`getCheckboxProps` 对他单行禁用勾选；金额与备注输入框条件补 `record._isCurrent`。
- `form.vue` 的 `SettlementItem.remainingAmount` 放宽为可选——银行流水详情内嵌的 `orderFee` 不返回该字段，他单行展示 `-`；`validateForm` 超额校验相应加 `!== undefined` 守卫。
- `loadBankStatementSummary` 不再并发调 `BankStatement/GetReceiveSettlementPagedListAsync`（该接口按操作人权限过滤且只有汇总），「已结算（不含本单）」改为对 `detail.receiveSettlements[].totalSettledAmount` 剔除当前 `editId` 后求和，与明细表他单行同源同一次请求。

## 避坑指南

- **保存/校验/合计只认 `items`**：`currentSettlementTotal`、`validateForm`、`handleSave`、`handleDeleteSelectedItems` 全部仍遍历 `items.value`，不要图省事换成 `tableItems`，否则会把别人的核销金额算进本单并提交。
- **他单行 `_key` 必须用后端 id**（`foreign_${item.id}`），不能复用 `makeRowKey()`。`foreignItems` 是 computed，每次重算都会生成新 key，会让整张表反复重挂载。
- **一条费用可以被多张核销单重复结算**（示例数据里 `orderFeeId` 相同的行出现在 3 张单据），所以 `selectedFeeIds` / `selectedInvoiceItemIds` 仍只取本单明细，不要把他单费用加进「已选」去屏蔽。
- **两个表单都会混入另一种类型的明细**：费用结算页会显示他人的开票结算行，开票结算页会显示他人的按费用行（后者没有开票申请单号/发票号/本单开票额，渲染为 `-`）。
- 若 `BankStatement/DetailAsync` 未下发 `receiveSettlements`，`foreignItems` 为空、`otherSettledAmount` 归零，页面退化成只显示本单明细且「剩余可结算」会偏大，不会报错但校验会放宽——接口契约变动时优先回归这里。
- `totalSettledAmount` 是后端算好的净额（收正付负、跨两类子表），直接求和即可；不要拿他单明细行的 `settledAmount` 自己累加，那是毛额且不区分方向。
- `getBankStatementReceiveSettlementPagedListByPermission` 至此在收费核销表单中不再使用；银行流水工作台的「关联核销单」面板走的是 Admin 变体 `getBankStatementReceiveSettlementPagedList`，两者不要混改。
