---
title: 业务费用与客户对账外键改 SimpleDto 对象返回前端对接
module: 业务费用 / 客户对账
author: auto-doc-sync
last_updated: 2026-08-09
---

# 1. 背景意图 (Background)

后端统一规范：详情/列表接口的关联外键禁止平铺名称字段，一律以 SimpleDto 对象返回，仅保留创建人昵称 `creatorUserName` 平铺。

本次落地两块：

1. **客户对账** `StatementDto` 头部客户对象化、`StatementCurrencyDto` 币别对象化
2. **业务费用** `OrderFeeDto`（含 `OrderFeeAndTaskDto`）的费用代码/币别/结算对象三组外键全局对象化；**所有嵌套返回 `OrderFeeDto` 的接口一并受影响**（海运出口/进口、空运出口、更改单、付费申请、付费结算、收费结算、开票申请、发票开出、银行流水）

# 2. 核心逻辑变更 (Core Logic)

## 2.1 字段映射速查

| 旧写法                 | 新写法                   |
| :--------------------- | :----------------------- |
| `fee.feeCodeName`      | `fee.feeCode?.cnName`    |
| `fee.feeCodeCode`      | `fee.feeCode?.code`      |
| `fee.currencyName`     | `fee.currency?.cnName`   |
| `fee.currencyCode`     | `fee.currency?.code`     |
| `fee.settlementName`   | `fee.settlement?.name`   |
| `fee.settlementCode`   | `fee.settlement?.code`   |
| `statement.clientName` | `statement.client?.name` |
| `group.currencyCode`   | `group.currency?.code`   |

主键 Id 不变：`feeCodeId` / `currencyId` / `settlementId` / `currencyId` 仍返回并继续用于下拉回填与后端查询参数。

## 2.2 API 类型定义（10 个文件）

各处同名 `OrderFeeDto` 删除六个平铺字段，新增 `feeCode?: FeeCodeSimpleDto`、`currency?: CurrencySimpleDto`、`settlement?: ClientSimpleDto`：

- `src/api/sea-export/order-fee-admin.ts`（补全 `FeeCodeSimpleDto` 的 `code`/`enName`/`currencyId`/`defaultUnit`/`isConfidential`/`isInvoiceProhibit`/`taxRate`）
- `src/api/sea-import/order-fee-admin.ts`、`src/api/sea-import/sea-import-admin.ts`
- `src/api/air-export/air-export-admin.ts`
- `src/api/sea-export/payment-settlement-admin.ts`（含 `OrderFeeForSelectionDto`，后端同为 `OrderFeeDto`）
- `src/api/settlement-management/payment-application-admin.ts`
- `src/api/settlement-management/receive-settlement-admin.ts`
- `src/api/settlement-management/invoice-application-admin.ts`
- `src/api/Invoice/InvoiceIssue.ts`
- `src/api/settlement-management/statement-admin.ts`：`StatementDto` 删 `clientName`/`clientCode` 加 `client`；`StatementCurrencyDto` 删 `currencyCode`/`currencyCnName`/`currencyEnName` 加 `currency`

## 2.3 视图层改造（约 40 个文件）

| 场景 | 改法 |
| :-- | :-- |
| vxe-table `field` | 改点号路径，如 `field: 'client.name'`、`'feeCode.cnName'`、`'settlement.name'`、`'currency.code'` |
| vxe-table `formatter` | 形参改读 `row.feeCode?.cnName` 等 |
| a-table `dataIndex` | 改数组路径，如 `dataIndex: ['feeCode', 'cnName']` |
| 自定义 `#bodyCell` / `#innerBodyCell` | 新增 `column.key` 分支显式读嵌套对象 |
| 手写映射（`mapDetailToFeeRows`、`transformToTreeData` 等） | 直接改成可选链读对象 |
| 币别汇总聚合 | 统一 `currency?.cnName ?? currency?.code` 兜底 |

## 2.4 Handsontable 结算对象缓存口径统一

`useOrderFeeLinkage.ts`（海出/海进）原先把联动结果写回 `row.settlementName`，与后端 DTO 字段同名易混淆；现改写入本地私有键 `row.__settlementName`，`order-fee-table-handsontable.vue` 的 `getSettlementLabel` 按 `row.settlement?.name ?? row.__settlementName` 顺序取值。

## 2.5 校验结果

`vue-tsc --noEmit` 全量错误数由 1353 降至 1298，**无新增类型错误**（差异项经逐条比对均为既有报错的行号位移）。

# 3. 避坑指南 (Pitfalls)

- **判定要看后端返回类型，不能只看前端接口名**。前端有些 interface 是自己起的别名，实际后端返回的就是通用 `OrderFeeDto`：
  - **受影响**：`OrderFeeDto`（各模块同名）、`OrderFeeForSelectionDto`（付费结算选申请，`doc/付费结算/付费结算选择付费申请列表接口文档.md` 明确写 `orderFees: List<OrderFeeDto>`，字段表完全一致）
  - **不受影响**（后端确为独立 DTO）：`ReceiveSettlementFeeDto`（带 `remainingAmount`，`change-log-2026-07-14` 中与 `OrderFeeDto` 并列列出）、`InvoiceAppSettleItemDto`、`OrderFeeForSettlementDto`、`OrderFeeSimpleDto`、`PayAppTaskItemDto`
  - 拿不准时查 `doc/` 下对应接口文档的出参类型，比对字段表是否与 `OrderFeeDto` 一致。
- **本地视图模型不要动**：`SelectedFeeItem`、`FeeDetailRow`、`SettlementItem`、树节点 `feeName`/`settlementUnit` 等是前端自定义结构，其 `feeCodeName`/`currencyName` 字段照旧；只需把**写入它们的数据源**换成对象路径。
- **`OrderFeeEditDto.originalInfo` 的平铺字段勿删**：申请修改的「修改前快照」靠它做对比展示。
- **a-table 数组 dataIndex 有前提**：只有走 antd 默认渲染时才生效。若组件的 `#bodyCell` 兜底分支写的是 `record[column.dataIndex]`（如 `NestedDataTable`），数组路径取不到值，必须改成显式 `column.key` 分支——`add-fee-modal/index.vue` 即为此例。
- **付费申请头**上的 `settlement`/`currency` 是既有对象结构，本次只动嵌套的 `OrderFeeDto`。
- **打印**：对账单客户占位符改 `Client.FullName`/`Client.Name`，费用结算对象改 `Settlement.FullName`/`Settlement.Name`；但打印专用 `StatementCurrencyFeeCodeDto` 仍保持平铺（FastReport 需要）。
- 后端 AutoMapper 若未 Include 导航属性则对象为 null，前端一律用可选链 + 兜底文案。
