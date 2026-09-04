---
title: 付费申请发票改子表对接
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-04
---

# 1. 背景意图 (Background)

后端把付费申请主表上的 `invoiceNo` / `invoiceDate` 拆成发票子表 `paymentApplicationInvoices`，一张申请可挂多张发票，每张票各自一个附件。前端按 2026-09-04 对接文档改读写结构，并接入批量下载发票附件。

# 2. 核心逻辑变更 (Core Logic)

- **入参**：`AddAsync` / `EditAsync` / `EditInvoiceAsync` 不再传主表 `invoiceNo`/`invoiceDate`，改为 `paymentApplicationInvoices[]`（`invoiceNo` 必填、`invoiceDate` 可空、`attachment` 为单个对象）。编辑仍是全量覆盖。
- **出参**：列表/详情读 `paymentApplicationInvoices`；`invoiceProcess` 视为必填。付费结算选单不填充该数组。
- **校验**：先票后付至少一条；不开票必须为空；先付后票不限。同一申请发票号不可重复，最长 128。
- **界面**：编辑页与补录弹窗改为可增删的发票明细表，每行单文件上传+识别；列表发票号/开票日期逗号拼接；工具栏「批量下载发票」走 `DownloadInvoicesAsync`；审批详情附件区展示发票行。

# 3. 避坑指南 (Pitfalls)

- 编辑必须回传**全部**发票行，漏传会被删掉（连附件一起）。
- 发票扫描件挂在发票行上（模块 `160110`），不要再指望申请自身 `attachmentGroup` 的「发票」分组来绑定票面文件。
- `attachmentId` 按字符串原样透传，不要 `Number()`。
- 批量下载传的是**付费申请 id**，不是发票 id；单次前端限制 50 条；部分缺附件时接口仍成功，要用 `missingInvoiceNos` 提示。
- 列设置仍用 `invoiceNo`/`invoiceDate` 字段名以免旧列配置对不上，展示走插槽从子表拼接。
