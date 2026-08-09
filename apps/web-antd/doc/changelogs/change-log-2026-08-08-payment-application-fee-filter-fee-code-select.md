---
title: 付费申请费用明细「费用名称」改用货代费用下拉
module: 费用管理 / 付费申请
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

付费申请费用明细筛选栏「费用名称」输入关键字（如「驳船」）时下拉不触发/不更新远程检索（TAPD #0700）。根因有二：误用 `FeeNameSelect`（`FeeNameAdmin`），与明细比对字段 `feeCodeId` 不一致；筛选区用 `<label>` 包裹可搜索 Select，易抢焦点并触发收起清空搜索词。

# 2. 核心逻辑变更 (Core Logic)

1. 筛选控件改为 `FeeCodeSelect`，请求 `FeeCodeAdmin/GetPagedListAsync`，与添加费用抽屉及本地 `feeCodeId` 过滤一致。
2. 筛选栏五个字段容器由 `<label>` 改为 `<div>`，避免 Select 在 label 内失焦收起后 `clearKeyword`。
3. 删除已无业务引用的 `FeeNameSelect` 组件及其 adapter 注册/导出（保留 `FeeNameAdmin` 基础资料 CRUD）。

# 3. 避坑指南 (Pitfalls)

- 费用业务选型统一用 `FeeCodeSelect` / `feeCodeId`，勿再引入 `FeeNameAdmin` 分页下拉。
- 含 `usePagedSelect` 的可搜索 Select 不要包在 `<label>` 里。
- 选中后表格按 `feeCodeId` 精确过滤；仅输入未选中时表格不会变（符合 Select 语义）。
