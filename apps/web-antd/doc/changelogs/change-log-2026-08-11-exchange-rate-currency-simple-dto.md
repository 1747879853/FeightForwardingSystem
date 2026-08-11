---
title: 汇率管理列表币别改读 currency SimpleDto
date: 2026-08-11
module: basic-data
---

# 背景意图

汇率管理列表「币别」列空白。后端已将平铺 `currencyCode` 改为 `currency` 对象，列表列仍读旧字段。

# 核心逻辑变更

`ExchangeRateAdmin/data.ts`：

- 列表列改为 `formatter` 读 `row.currency?.code`（兜底 `cnName` / `formatCurrencyName(currencyId)`）
- `formatCurrencyName` 支持 string id，比较时统一 `String()`，避免缓存 key 类型不一致

`list.vue`：去掉未使用的 `formatCurrencyName` import。

# 避坑指南

- 勿再读平铺 `currencyCode`；与外联 SimpleDto 改造口径一致
