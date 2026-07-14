---
title: 收费核销新增「按开票申请结算（发票结算）」
date: 2026-07-14
type: Feature
module: 费用管理 / 收费核销
---

# 背景意图

收费核销原本只支持「按费用（按业务）」结算（`type=0`）。业务上还存在「按开票申请结算」的诉求：财务需要基于已开票的开票申请，按发票口径把银行流水与已开票费用核销起来，且与「按费用结算」共用同一条 `OrderFee.SettledAmount` 已结算池（两种结算互斥，同一额度只能被其中一种占用）。

本次在前端补齐「发票结算」（`type=1`）的完整链路：分组选择开票明细、新建/编辑、追加/删除明细、锁定/解锁、列表区分类型。

# 核心逻辑变更

## 1. API 层（`api/settlement-management/receive-settlement-admin.ts`）

- 新增枚举 `PaySide`（0 应收 / 1 应付）、`ReceiveSettlementType`（0 按费用 / 1 按开票申请）。
- 既有 DTO 补字段：
  - `ReceiveSettlementFeeDto` / `OrderFeeDto` 增加 `paySide`。
  - `ReceiveSettlementDetailDto` / `ReceiveSettlementListDto` 增加 `type`、`totalSettledAmount`（净额 = Σ收 − Σ付，跨两张子表）、`creatorUserNickName`、`lastModifierUserNickName`。
  - `ReceiveSettlementDetailDto` 增加 `receiveSettlementInvoiceItems`（按开票申请明细）。
- 新增 DTO：`InvoiceAppSettleQueryDto`、`InvoiceAppSettleGroupDto`、`InvoiceAppSettleItemDto`、`ReceiveSettlementByInvoiceItemDto`、`ReceiveSettlementAddByInvoiceDto`、`ReceiveSettlementAddItemsByInvoiceDto`、`ReceiveSettlementDeleteInvoiceItemsDto`、`ReceiveSettlementInvoiceItemDetailDto`。
- 新增 4 个接口函数：
  - `getInvoiceApplicationGroupForSettlement` → `GetInvoiceApplicationGroupForSettlementAsync`
  - `addReceiveSettlementByInvoiceApplication` → `AddByInvoiceApplicationAsync`
  - `addReceiveSettlementItemsByInvoiceApplication` → `AddItemsByInvoiceApplicationAsync`
  - `deleteReceiveSettlementInvoiceItems` → `DeleteInvoiceItemsAsync`

## 2. 页面

- 新增 `add-invoice-application-drawer/`（`index.vue` + `data.ts`）：按开票申请分组（一组 = 一张已开票申请），展开后按费用明细勾选，展示收付方向、本单开票额、发票可结算余额，录入本次结算金额；「仅显示可结算」开关对应 `onlySettleable`。
- 新增 `invoice-form.vue`：按开票申请的新建/编辑/只读页，复用收费核销的银行流水信息卡片、锁定/解锁/删除逻辑；结算净额按 `paySide` 计算（应付计负）。
- `receive-settlement-grid.vue`：工具栏新增「新建发票结算」按钮；双击行按 `row.type` 进入对应编辑页（`/edit` 或 `/edit-by-invoice`）。
- `data.ts`：列表新增「结算类型」列，「明细总金额」列更名为「结算净额」。
- `form-data.ts`：新增 `getReceiveSettlementTypeLabel/Color`、`getPaySideLabel/Color`、`toNetAmount` 辅助函数。
- 路由（`router/routes/modules/fee-management.ts`）：新增 `add-by-invoice`、`edit-by-invoice/:id` 两条页面级路由，指向 `invoice-form.vue`。

# 避坑指南

- **共用已结算池**：按费用与按开票申请两种结算共用 `OrderFee.SettledAmount`；发票口径可结算余额 = `max(0, 已开票 − 已结算)`。同一费用可能出现在多张已开票申请中，前端把同一 `orderFeeId` 的余额当作共享池做聚合校验，最终以后端悲观锁双口径校验为准。
- **净额而非毛额**：列表/详情的 `totalSettledAmount` 是净额（收正付负），落库仍是各自毛额；前端展示与「本单本次净额」均需按 `paySide` 换算。
- **明细金额不可编辑**：与按费用结算一致，编辑态已保存明细只展示，调整须先删后加（删除走 `DeleteInvoiceItemsAsync`）。
- **类型不可混**：type=0 与 type=1 各走各的追加接口；对 type=0 调用按开票追加会被后端拒绝。列表双击必须依据 `row.type` 路由到正确表单。
