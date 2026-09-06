---
title: 付费申请先票后付发票改到提交时校验
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-06
---

# 背景意图

后端把「先票后付必须有发票」从新增/编辑挪到 `SubmitAsync`，并取消 Add/Edit 传 `status=1` 的保存并提交。前端原先在录入阶段就拦空发票，先票后付只能先编假票号才能建单；从应收应付勾选费用新建走同一套保存校验，也会被提前拦住。

# 核心逻辑变更

- **录入放行：** `validateInvoiceRows` 不再要求先票后付有票。抽屉确认自动 `AddAsync`、页面保存、从应收应付带 `orderFeeIds` 预填后保存，都可以先建单再补票。
- **提交拦截：** 编辑页「提交」、列表勾选提交，先票后付且发票子表为空时提示「提交前必须录入发票信息」，再调 `SubmitAsync`。
- **提交入口收口：** `AddAsync` / `EditAsync` 不再传 `status` / `submitTime`。隐藏的「保存并提交」改为先 Add 再 `SubmitAsync`。
- **列表补票：** 先票后付也可点「发票流程」打开 `EditInvoiceAsync` 弹窗，方便提交前补票。

# 避坑指南

- 传 `status=1` 不会报错，单据会静默停在录入。提交只能走 `SubmitAsync`。
- 「已取得发票」只看子表，不要用 `InvoiceProcess=先票后付` 当替身。
- 不开票仍在录入时清空发票行；先票后付空票只卡提交。
