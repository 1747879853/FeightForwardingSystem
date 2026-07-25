# 2026-07-25 业务联系单费用补齐 PreOrderFeeAddDto 字段与联动

## 背景意图

费用表原先只覆盖收付/费用代码/结算对象/币别/单位/数量/含税单价/税率/金额/备注，缺少 `industryCategory`、`exchangeRate`、`noTaxUnitPrice`（已算未展示）、`invoiceBlocked`、`isConfidential` 的录入列，且费用代码 → 类别/结算/币别/税率、币别 → 汇率等联动未接。录入口径需对齐 `PreOrderFeeAddDto` 与海出费用。

## 核心逻辑变更

- **新增列**：结算对象类别、汇率、不含税单价（只读）、禁开票、机密。
- **费用代码变更**：拉 `FeeCodeDetail` → 应收用 `defaultDebitName` / 应付用 `defaultCreditName` 写行业类别并按往来单位带结算对象；写币别并 `getExchangeRateDetail` 带汇率（应收 `crValue` / 应付 `drValue`）；写税率、默认单位、`isInvoiceProhibit`→禁开票、`isConfidential`→机密；箱型单位继续走卖价/箱量。
- **行业类别变更**：`ClientSelect` 按字母码过滤；并从委托单位(p)/发货人(b)/收货人(e)/通知人(h) 带出 `settlementId`（编辑页经 `parties` 传入实时 id）。
- **币别 / 收付变更**：重取汇率；收付切换时若已有费用代码，按收付口径重带行业类别与结算对象。
- **新增行**：默认 USD + 拉取汇率；金额始终 `recalcAmount`（含不含税单价）。

## 避坑指南

1. **汇率不是 CurrencySelect 自带字段**：与海出一致，调 `getExchangeRateDetail(currencyId)`（接口以币别 Id 取汇率详情）。
2. **行业枚举复用** `getIndustryCategoryOptions` / `IndustryCategorySelect`，存数值 `key`，过滤客户用字母 `value`。
3. **联系单无场站/船代等**：结算对象自动带出仅覆盖 p/b/e/h；其余类别需手选客户。
4. **不含税单价只读**：`noTaxUnitPrice = unitPrice / (1 + taxRate/100)`，不提供反推编辑。
