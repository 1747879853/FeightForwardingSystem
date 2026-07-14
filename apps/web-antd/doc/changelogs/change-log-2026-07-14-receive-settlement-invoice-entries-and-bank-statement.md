---
title: 发票结算入口整合与银行流水页支持发票结算
date: 2026-07-14
type: Feature
module: 费用管理 / 收费核销、财务管理 / 银行流水编辑
---

# 背景意图

「按开票申请结算（发票结算，type=1）」上线后，需要把入口整合得更符合财务操作直觉，并让银行流水编辑页（财务视角）能一站式查看/创建两种结算：

1. 收费核销列表主入口「新建 / 新建发票结算」两个并排按钮不够收敛。
2. 收费核销页「银行流水」Tab 的「新建」只能建费用结算。
3. 银行流水编辑页 `bank-statement/edit/:id` 的「关联收费核销」只展示费用结算明细、双击只进费用结算编辑页；底部「选择费用并创建结算单」也只能建费用结算。

# 核心逻辑变更

## 1. 入口合并为悬浮下拉

- `receive-settlement/receive-settlement-grid.vue`：原「新建」+「新建发票结算」合并为一个 `Dropdown`（hover 触发），下拉项「费用结算 / 发票结算」；主按钮点击默认走费用结算。
- `receive-settlement/bank-statement-grid.vue`：「新建」同样改为 hover 下拉；`navigateToCreateReceiveSettlement(row, type)` 支持 `fee`/`invoice`，分别跳 `/add?bankStatementId=` 与 `/add-by-invoice?bankStatementId=`；抽出 `getSingleSelectedRow` 复用单选校验。

## 2. 银行流水编辑页「关联收费核销」支持两种结算

- `api/settlement-management/bank-statement-admin.ts`：`ReceiveSettlementListDto` 增加 `type`。
- `bank-statement/form-data.ts`：新增 `getReceiveSettlementTypeLabel/Color`、`isInvoiceReceiveSettlement`、`getReceiveSettlementPaySideLabel/Color`、`useReceiveSettlementInvoiceItemReadonlyColumns`；`useReceiveSettlementColumns` 增「结算类型」列，`totalSettledAmount` 列改名「结算净额」。
- `bank-statement/utils.ts`：新增 `mapReceiveSettlementInvoiceDetailItem`（开票明细 → 只读行）。
- `bank-statement/components/receive-settlement-panel.vue`：
  - 双击按 `row.type` 跳 `/edit` 或 `/edit-by-invoice`。
  - 行展开区按 `detail.type` 分别渲染费用明细或开票明细列（`getItemColumns` 选列，展开区补收付方向 Tag）。
  - 明细删除按结算类型走 `DeleteInvoiceItemsAsync` 或 `DeleteItemsAsync`。
  - 列表新增「结算类型」Tag。

## 3. 底部建单支持发票结算

- 新增 `bank-statement/components/create-settlement-invoice-panel.vue`：按开票申请分组内联选明细并 `AddByInvoiceApplicationAsync` 建单；复用抽屉 `add-invoice-application-drawer/data` 的搜索 schema/分组列，隐藏结算对象/币别（随流水固定），含「仅显示可结算」开关；剩余可结算按净额（`toNetAmount`，应付计负）计算。
- `bank-statement/form.vue`：底部用 `Segmented`「费用结算 / 发票结算」切换 `CreateSettlementFeePanel` 与 `CreateSettlementInvoicePanel`；`reloadActiveCreatePanel` 统一刷新当前面板。

# 避坑指南

- **净额口径**：银行流水「已结算/剩余可结算」用净额（收正付负），发票面板本批合计也是净额；不要用毛额求和。
- **删除接口分流**：关联面板删除明细必须按该结算行的 `type` 选接口，费用结算与发票结算子表不同。
- **列表 type 依赖后端**：`GetReceiveSettlementPagedListAsync` 需返回 `type`，否则类型列与双击路由会全部落到费用结算分支（默认值）。
- **发票口径共享池**：同一 `orderFeeId` 在多张已开票申请中共享可结算余额，前端按费用聚合校验，最终以后端悲观锁双口径为准。
