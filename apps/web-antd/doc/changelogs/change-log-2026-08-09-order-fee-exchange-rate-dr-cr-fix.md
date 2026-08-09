---
title: 应收应付费用表汇率应收/应付取值取反修复
date: 2026-08-09
module: sea-exports / sea-imports
---

# 背景意图

汇率表里 `drValue` 是**应收汇率**、`crValue` 是**应付汇率**（见 `FeeCodeAdminApi.ExchangeRateSimpleDto` 字段注释）。海运出口 / 海运进口应收应付费用表（vxe 版 `order-fee-table.vue`）走 `adapter/vxe-table.ts` 里的 `FeeCodeSelect` / `CurrencySelect` 单元格渲染器带汇率，这两处把收付判断写成了 `props?.type ? drValue : crValue`——`type` 为 0 应收、1 应付，等于**应收拿了应付汇率、应付拿了应收汇率**，两者不等时费用折本位币金额直接错。

# 核心逻辑变更

`apps/web-antd/src/adapter/vxe-table.ts` 两处（费用代码带出汇率、币别变更带出汇率）改为：

```ts
row['exchangeRate'] =
  Number(props?.type) === 1
    ? exchangeRateData.crValue // 应付
    : exchangeRateData.drValue; // 应收
```

同时修正 `sea-export-admin` / `sea-import-admin` 的 `useDropdownSources.ts` 中 `getExchangeRateFromCache` 那条 `console.log` 的收付文案（取值逻辑本就正确，只是日志把应收应付写反，排查时会误导）。

# 避坑指南

- `props?.type` 是数字 0 / 1，直接当布尔用时 `0` 落到 else 分支，语义与「应收」正好错位；判断一律写 `Number(props?.type) === 1`。
- 口径基准：**应收 `drValue`、应付 `crValue`**。仓库里其余取值点（`useOrderFeeLinkage`、`useDropdownSources`、`order-fee-editor-modal` 的 `valueKey`）本来就是这个口径，本次只有 vxe 渲染器两处是反的。
- 历史数据不会被自动纠正：本次修复只影响修复后新带出的汇率，之前录错的费用行需要业务侧改币别 / 重选费用代码触发重取，或手工改汇率。
