---
title: 付费申请从进项发票选择按钮位置与弹窗表头对齐
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 背景意图 (Background)

「从进项发票选择」原先在发票行工具栏，离发票方式较远；弹窗表格仅开纵向滚动时，表头不预留滚动条宽度，「附件」列右侧错位。

# 2. 核心逻辑变更 (Core Logic)

- 表单页：按钮挪到发票方式 Tab 组「不开票」右侧；不开票时隐藏。
- 列表补录弹窗：按钮挪到发票流程下拉右侧。
- `InvoiceTable` 增加 `showPickButton`，外置时走 `expose.openInputInvoicePicker`。
- 挑票弹窗：`scroll.x` + 固定列宽 + 表头 `overflow-y: scroll` / `scrollbar-gutter: stable`，与表体滚动条占位对齐。

# 3. 避坑指南 (Pitfalls)

- Ant Design Table 只设 `scroll.y` 时，表体有滚动条、表头没有，最右列会错位；表头也要预留同样的滚动条槽。
