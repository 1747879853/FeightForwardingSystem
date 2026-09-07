---
title: 付费申请上传发票自动识别
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-07
---

# 1. 背景意图 (Background)

后端新增 `UploadAndExtractInvoiceAsync`：一次请求落成附件并返回识别结果。付费申请原先要先通用上传、再手动点「识别」，现改为上传即识别回填。

# 2. 核心逻辑变更 (Core Logic)

- API：`uploadAndExtractInvoice` 调 `GeminiAdmin/UploadAndExtractInvoiceAsync`，超时 180 秒。出参是通用上传字段 + 嵌套 `invoice`。
- 发票明细行、名称含「发票/invoice」的申请附件分组：选 PDF/图片后走该接口，成功则回填票号、开票日期、销售方抬头、金额。
- `invoice` 为 `null` 时附件仍保留，提示手工填写或点「重新识别」（仍走原 `ExtractInvoiceAsync`）。
- 识别结果只预填表单，不自动保存。

# 3. 避坑指南 (Pitfalls)

- 该接口只收 PDF/图片；图片 5MB、PDF 10MB。xlsx/txt 会被前端拦截。
- `invoice` 为 `null` 是整体识别失败，接口仍 success；有对象但字段为 `null` 表示发票上找不到该项。
- 不要把 `sellerTaxNo` 填进抬头；`totalAmount` 才映射到发票行 `amount`。
- 默认请求超时 20 秒，必须单独设 180 秒。
