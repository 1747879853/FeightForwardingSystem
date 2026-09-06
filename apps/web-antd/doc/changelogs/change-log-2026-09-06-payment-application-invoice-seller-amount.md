---
title: 付费申请发票增加销售方抬头与金额
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-06
---

# 1. 背景意图 (Background)

后端发票子表新增 `sellerHeader`（销售方抬头）、`amount`（发票金额），均非必填。前端录入、列表、审批详情对齐这两个字段，并在界面上额外展示「总额」（各行金额求和，不调后端）。

# 2. 核心逻辑变更 (Core Logic)

- **入参/出参**：`paymentApplicationInvoices[]` 增加 `sellerHeader`、`amount`。抬头是普通文本，最长 256，不做客户下拉。金额允许负数（红字发票），不与申请金额比对。
- **总额**：`sumInvoiceAmounts` 在前端对已填金额求和；列表「发票总额」列、表单/补录弹窗底部、审批附件区都用这一口径。全部未填时列表与审批不显示数字。
- **识别**：`ExtractInvoiceAsync` 把 `invoiceNo` / `invoiceDate` / `sellerHeader` / `totalAmount` 回填到发票行；`sellerTaxNo` 不写入抬头。
- **校验**：保存时抬头超 256 字拦截；金额无正数/等于申请额限制。发票号全局唯一仍由后端报错。

# 3. 避坑指南 (Pitfalls)

- 不要把 `sellerHeader` 做成客户选择器——开票方未必是系统客户。
- 不要拿发票金额去卡申请额度；总额只是展示。
- 发票识别抬头走 `sellerHeader`，不要把 `sellerTaxNo` 填进抬头。
- 编辑仍是全量覆盖，漏传行会连抬头、金额、附件一起删掉。
- 付费结算选单里 `paymentApplicationInvoices` 恒为 `null`，不要在那里读抬头或金额。
