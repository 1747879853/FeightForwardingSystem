---
title: 业务联系单先录费用再选开船日会漏弹汇率覆盖确认
date: 2026-08-30
module: pre-order
---

# 背景意图

新建页可以先加费用再填开船日期。费用先按「今天」取汇率；选了 ETD 后，若开船日落在另一段有效期，应弹出「按开船日期重新匹配汇率」。实际没弹，用户会以为改 ETD 不会重匹配。

# 核心逻辑变更

- 原因：`applyFeeRateAsOf` 刚写完 `feeRateAsOf` 就立刻调 `resyncRatesIfChanged`，子组件 `props.rateAsOf` 往往还是旧值（空=今天）。重匹配仍按今天，和先录费用时同一条汇率，被当成没变化。
- 修复：把刚算出的匹配日作为参数传给 `resyncRatesIfChanged` / `matchRateForRow`，不再等 props 刷新。

# 避坑指南

- 改 ETD（含清空回到今天）时，重匹配必须用这次算出的日期，不能读尚未刷新的 `props.rateAsOf`。
- 开船日和今天落在同一条汇率有效期内时，结果本来就一样，按设计不弹窗。
