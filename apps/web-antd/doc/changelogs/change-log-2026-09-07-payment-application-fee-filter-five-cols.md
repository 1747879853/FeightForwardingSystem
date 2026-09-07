---
title: 付费申请费用明细筛选改为一行五列
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-07
---

# 1. 背景意图 (Background)

费用明细上方五个筛选条件原先按三列网格排布，会折成两行。改为同一行五列，少占纵向空间。

# 2. 核心逻辑变更 (Core Logic)

- `.fee-filter-bar` 由 `1fr 1fr 1fr` 改为 `repeat(5, minmax(0, 1fr))`。
- 列间距收紧；「编号」标签变窄，「委托单位」等四字标签保持不换行。
- 筛选字段与过滤逻辑不变。

# 3. 避坑指南 (Pitfalls)

- 不要用 `<label>` 包可搜索 Select，会抢焦点清空远程搜索词。
- 列用 `minmax(0, 1fr)`，避免输入框把整行撑出卡片。
