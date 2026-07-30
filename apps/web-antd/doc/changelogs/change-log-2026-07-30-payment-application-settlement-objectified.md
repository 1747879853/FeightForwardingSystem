---
title: 付费申请出参对象化与列表结算明细弹窗
module: 付费申请
author: auto-doc-sync
last_updated: 2026-07-30
---

# 1. 背景意图 (Background)

后端 `PaymentApplicationDto` 已破坏性调整：删除 `clientName`、`currencyCode`、`paymentSettlementAttachments`，统一返回对象化 `settlement`、`currency` 与按结算单聚合的 `paymentSettlements`（含 `attachments`）。前端需同步改读新字段，并在列表对「部分结算 / 结算完毕」状态提供结算明细与附件查看入口。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 涉及文件

- `src/api/settlement-management/payment-application-admin.ts`：DTO 对齐后端
- `src/views/fee-management/payment-application/data.ts`：列表列改读 `settlement.name` / `currency.code`
- `src/views/fee-management/payment-application/list.vue`：状态可点击 + 弹窗
- `src/views/fee-management/payment-application/settlement-detail-modal.vue`：结算明细弹窗（新建）
- `src/views/fee-management/payment-application/form.vue`：详情回显与结算附件改从 `paymentSettlements` 展平
- `src/views/audit-approval/payment-review/detail-panel.vue`：同上
- `src/views/settlement-management/payment-settlement/**`：选择抽屉与结算表单展示适配对象化字段

## 2.2 列表交互

- 申请状态为 `Partial(4)` / `Settlemented(5)` 时，状态 Tag 可点击
- 点击后打开 `SettlementDetailModal`，展示当前行 `paymentSettlements`：结算单号、时间、结算对象、币别、整单结算金额、附件（点击打开）
- 无关联结算时弹窗展示空态；其它状态点击无效果

## 2.3 字段映射

| 旧字段                         | 新读法                                   |
| :----------------------------- | :--------------------------------------- |
| `clientName`                   | `settlement?.name`                       |
| `currencyCode`                 | `currency?.code`（无币别时展示「原币」） |
| `paymentSettlementAttachments` | `paymentSettlements[].attachments` 展平  |

# 3. 避坑指南 (Pitfalls)

- 勿再兼容 `clientName` / `currencyCode` / `paymentSettlementAttachments`，后端已删除
- `paymentSettlements[].totalSettledPrice` 是整张结算单金额，非本申请分摊
- 申请自身附件仍走 `attachmentGroup`；结算附件只在 `paymentSettlements[].attachments`
- 列持久化字段名已从 `clientName`/`currencyCode` 改为 `settlement.name`/`currency.code`，用户本地列配置可能需重新调整一次
