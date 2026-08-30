---
title: 汇率对不上本位币不再兜底
date: 2026-08-30
module: pre-order
---

# 背景意图

同一外币可以对应多家公司不同本位币。以前业务联系单查汇率时，对不上本公司本位币还会随便拿一条同外币的有效记录来填，容易填成别的公司的汇率。现在统一：对不上就当没维护，格子留空让人填。

# 核心逻辑变更

- `peekExchangeRate` / `peekExchangeRateOnDate` / `resolveExchangeRate*` 只走「费用币别兑指定本位币」，对不上或没传本位币返回 `undefined`。
- 删掉跨本位币兜底（原 `pickEffectiveRate`）和 `strictLocalCurrency` 开关；海出/海进费用录入本来就是严格匹配，只是业务联系单从宽松改严。
- 费用币别本身就是本位币时，页面仍锁汇率 1（`__isLocalCurrency`），这不是缓存兜底。

# 避坑指南

- 表里只有 USD 兑 EUR、公司本位币是 RMB 时，USD 费用行汇率会空，不会拿 EUR 那条来填。
- 没传 `localCurrencyId` 也视为未维护，不要指望「同外币随便挑一条」。
