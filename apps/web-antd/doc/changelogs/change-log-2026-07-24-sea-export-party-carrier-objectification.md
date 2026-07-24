---
title: 海运出口往来单位与船公司对象化前端对接
module: 海运出口 / 付费申请 / 开票申请 / 工作台
author: auto-doc-sync
last_updated: 2026-07-24
---

# 1. 背景意图 (Background)

后端对 `SeaExportDto`、`TransportOrderDto`、`PayAppFeeGroupDto` 做破坏性变更：往来单位与船公司由扁平 `*Name` 字符串改为简易对象；同日 `SeaExportSimpleDto` 的 POL/POD/Carrier 亦对象化。前端需同步类型与全部消费点，避免列表/详情/费用/工作台读到 `undefined`。

# 2. 核心逻辑变更 (Core Changes)

| 范围 | 变更前 | 变更后 |
| :-- | :-- | :-- |
| 海出往来单位 | `bookingAgentName` / `yardName` / `shipAgentName` / `podAgentName` / `secondNotifierName` | `bookingAgent?.name` 等（`ClientSimpleDtoForOrder`） |
| 海出船公司 | `carrierName` / `carrierCnShortName` / `carrierCode` | `carrier?.cnName` / `cnShortName` / `code`（英文简称）；`carrierLogo` 仍同级 |
| 运输单往来单位 | `clientName` / `teamName` / `custBrokerName` / … / `notifierName` | `client?.name` / `team?.name` 等 |
| 付费申请费用分组 | `PayAppFeeGroupDto.clientName` | `client?.name` |
| 开票/发票简易海出 | `SeaExportSimpleDto.polName/podName/carrierName` | `pol` / `pod` / `carrier` 简易对象 |
| 列表列持久化 | 列 `field` / 排序 `fieldMap` 键名 | **保留旧键**（如 `carrierCode`、`transportOrder.clientName`），展示改走 `formatter` / 插槽 |

**主要改动文件：**

- 类型：`sea-export-admin.ts`、`payment-application-admin.ts`、`invoice-application-admin.ts`、`InvoiceIssue.ts`、`invoiceRequest.ts`
- 海出：`data.ts`、`list.vue`、`basic-info-form/form.vue`、`orderFee/*`、`changeOrder/index.vue`、`separate-bill.vue`
- 工作台：`se-service-show-columns.ts`
- 费用：`add-fee-modal`、`add-fee-statement-modal`、`invoice-application/*`
- 审核：`expense-submission/modules/detail.vue`

# 3. 避坑指南 (Pitfalls)

1. **破坏性**：旧扁平 `*Name` 已从完整 DTO 响应移除，继续读会得到 `undefined`。
2. **Logo 不在 `carrier` 内**：仍用同级 `carrierLogo`。
3. **`TransportOrderSimpleDto.clientName` 未改**：开票/发票开出/费用审核等简易业务仍是字符串，勿与完整 `TransportOrderDto.client` 混用。
4. **`carrier.code` = 英文简称**，EDI 用 `ediCode`。
5. 对象可能为 `null`，展示须 `?.` 空值保护。
6. 列表列 `field` / `fieldMap` 故意保留旧名，避免列配置持久化与后端排序映射失效。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-24 | `Refactor` | 海出/运输单/付费分组/简易海出对接往来单位与船公司对象化 | 统一按 `对象?.name` / `carrier?.cnShortName` 取值；列 field 键保留 |
