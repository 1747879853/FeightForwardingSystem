---
title: 海运出口集装箱合计增加体积
module: 海运出口
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

集装箱信息底部合计已有箱型、件数、毛重，业务要求补上体积汇总（TAPD #0709）。

# 2. 核心逻辑变更 (Core Logic)

1. `order-ctn-table.vue` 的 `ctnSummary` 累加各行 `volume`。
2. 合计栏增加「体积 {totalVolume}」展示。

# 3. 避坑指南 (Pitfalls)

- 汇总用 `Number(row.volume)`，非法值忽略；展示走既有 `formatSummaryNumber`。
- 货物区「体积 CBM」与集装箱行「体积」字段不同源，勿混用。
