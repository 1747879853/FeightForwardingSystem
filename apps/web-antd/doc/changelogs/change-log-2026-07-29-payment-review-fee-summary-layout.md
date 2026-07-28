# 2026-07-29 付费审批右侧费用合计布局修复

## 背景意图

付费审批页（`/audit-approval/payment-review`）右侧「费用合计」在原币多币别场景下布局错乱；附件区仍按旧平铺 `attachments` 读取，既不显示又丢失附件明细类型。

## 核心逻辑变更

- 文件：`src/views/audit-approval/payment-review/detail-panel.vue`
- 币别改为紧凑纵向列表：币别 + 金额一行，开户行/账号/SWIFT 单行缩略，悬停 Tooltip 看完整信息。
- 附件按 `attachmentGroup` **保留类型分组**展示（类型名取自 `attachmentDtlType.name`）；结算附件单独一组「结算附件」。
- 附件卡片 `flex-shrink: 0`，避免被费用合计区挤没。

## 避坑指南

- 付费申请详情附件字段是 `attachmentGroup`（分组含类型），不要扁平合并后再丢掉类型。
- 展示时可只用「有文件的分组」，类型名优先 `attachmentDtlType.name`。
- 窄侧栏内长文本可用 ellipsis + Tooltip；附件区勿设可压扁到 0 的 flex。
