# 付费申请列表对接 EditInvoiceAsync（先付后票补录发票）

## 背景意图

后端新增 `EditInvoiceAsync`：仅改发票流程 / 发票号 / 开票日期 / 附件，**不判断 status**。审核通过后「先付后票」补录发票不能走 `EditAsync`（会被状态拦住）。列表侧对「先付后票」行提供点击入口，弹窗维护发票信息。

## 核心逻辑变更

1. **API**（`payment-application-admin.ts`）
   - 新增 `PaymentApplicationInvoiceEditDto`
   - 新增 `editPaymentApplicationInvoice` → `PUT .../EditInvoiceAsync`
2. **弹窗**（`invoice-edit-modal.vue`）
   - 打开时拉 `DetailAsync`，回填发票字段与 `attachmentGroup`
   - 保存走 `EditInvoiceAsync`；`attachmentGroup` **全量带回**（避免误清空附件）
   - 复用 `AttachmentGroups` 本地维护附件
3. **列表**（`list.vue` / `data.ts`）
   - 「发票流程」列改为插槽；仅 `invoiceProcess === 1`（先付后票）可点击
   - 点击打开维护弹窗，保存成功后刷新列表

## 避坑指南

| 坑 | 说明 |
| :-- | :-- |
| 附件被清空 | `attachmentGroup` 全量覆盖，保存时必须带回详情当前附件；清空才传 `[]` |
| 与 EditAsync 混用 | 任意状态下补录发票用本接口；完整编辑仍仅录入/驳回走 `EditAsync` |
| 点击范围 | 仅「先付后票」可点；先票后付 / 不开票无入口 |
| AddAttachments | 平铺追加、不改发票字段；本弹窗改发票+附件应走 EditInvoice，勿误用追加接口当保存 |
