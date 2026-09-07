---
title: 付费申请附件分组上传不再识别回填
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 背景意图 (Background)

申请附件与发票明细是两套附件。名称含「发票」的申请分组原先上传即走 `UploadAndExtractInvoiceAsync`，并把结果写入第一张空发票号的行，容易把申请归档文件误当成发票明细。现改为该分组与其它申请附件一样只通用上传。

# 2. 核心逻辑变更 (Core Logic)

- `attachment-groups.vue`：发票分组不再拦截上传、不再限 PDF/图片、不再识别、不再 `emit('extracted')`。
- 发票**行**附件仍走 `UploadAndExtractInvoiceAsync`，识别结果只回填当前行。
- 申请附件发票分组仍可点「重新识别」（`ExtractInvoiceAsync`），手动把已有附件识别结果写入第一张空发票号行。

# 3. 避坑指南 (Pitfalls)

- 发票扫描件应挂在发票明细行上，不要指望申请 `attachmentGroup` 的「发票」分组自动回填票号。
- 不要把历史 changelog「上传即识别」理解成申请附件现在仍会自动填行。
