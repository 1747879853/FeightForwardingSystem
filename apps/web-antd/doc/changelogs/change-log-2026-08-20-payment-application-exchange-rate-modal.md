---
title: 付费申请汇率弹窗改为双向折算并预填有效应付汇率
date: 2026-08-20
module: fee-management
---

# 背景意图

指定结算币别添加费用时，原「汇率录入」弹窗用 `RMB → USD` 加默认 `1`，看不出该填「1 美元兑多少人民币」还是反过来。TAPD #0608 要求改成双向「1 单位 =」展示。

# 核心逻辑变更

## 弹窗 UI（`add-fee-modal/exchange-rate-modal.vue`）

- 标题改为「币别汇率折算」。
- 每个原币与结算币别一对：先 `1 结算币 = x 原币`，再 `1 原币 = y 结算币`；改一侧另一侧取倒数。
- 确定后仍写入 **1 原币兑结算币**（`y`），申请金额折币 = 本次申请金额 × y，与原先乘法口径一致。

## 预填来源

- 打开弹窗时 `ensureExchangeRateCache(true)` 拉 `ExchangeRateAdmin/GetPagedListAsync`。
- 只取 **已启用** 且 **今天落在 startDate～endDate**（含起止当天，按日历日）的记录；付费申请用应付 `crValue`。
- 人民币/CNY 兑人民币视为 1；两边都有兑人民币汇率时交叉相除得到原币兑结算币。
- 无有效记录则留空，不再默认 1。

## 有效期比较（`utils/exchange-rate-cache.ts`）

汇率资料日期是 `YYYY-MM-DD`。原先按时刻比较，`endDate` 会被解析成当天 0 点，结束日白天会被误判过期。改为按本地日历日比较，结束日全天有效。

# 避坑指南

- 不要用币别 `defaultRate` 或应收 `drValue` 预填付费申请。
- 不要用 `ExchangeRateAdmin/DetailAsync` 按币别 id 取汇率（入参是汇率记录主键）。
- 交叉相除只用于预填；用户仍可手改。两边都不是人民币时，没有货币对行情，预填 = 原币.crValue ÷ 结算币.crValue。
