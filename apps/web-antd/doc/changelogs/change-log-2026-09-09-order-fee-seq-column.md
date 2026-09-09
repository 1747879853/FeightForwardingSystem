---
title: 费用表序号与开票状态拆成独立列
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-09
---

# 1. 背景意图 (Background)

Handsontable 费用表把行号画在「开票状态」格子里，表头只写开票状态，看起来像序号混进了开票状态列。应收应付与更改单共用这套列配置，需要拆开。

# 2. 核心逻辑变更 (Core Logic)

- `useHotColumns`：勾选列后增加独立「序号」列（只读，显示 `row + 1`）。
- 不再过滤 `invoiceStatus`，开票状态恢复为单独列（只读标签着色，列宽 100）。
- 列顺序：勾选 → 序号 → 开票状态 → 费用状态 → …

# 3. 避坑指南 (Pitfalls)

- 序号列 `data` 用 `_rowIndex`，不是业务字段；提交走 `sanitizeOrderFee` 白名单，不会带给后端。
- 勾选列仍是第 0 列，表头全选、行勾选点击不要改成按「序号」列判断。
