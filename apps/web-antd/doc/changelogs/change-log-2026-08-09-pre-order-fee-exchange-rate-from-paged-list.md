---
title: 业务联系单费用汇率改走汇率表生效记录
date: 2026-08-09
module: pre-order
---

# 背景意图

业务联系单（`/pre-order/:id/edit`）费用行的汇率原先按币别 id 调 `ExchangeRateAdmin/DetailAsync` 取值，与海运出口应收应付费用表的口径不一致：

- `DetailAsync` 的入参是**汇率记录主键**，这里传的却是**币别 id**，能取到值属巧合，取不到就静默保留旧值；
- 没有校验汇率记录的启用状态与有效期，过期 / 停用的汇率也会被带出来；
- 应收 / 应付取值取反（应收取了 `crValue`），而 `FeeCodeAdminApi` 明确 `drValue` 为应收汇率、`crValue` 为应付汇率；
- 本位币判断排在汇率表之前，币别一旦命中本位币就锁 1，即使汇率表里维护了该币别。

改为与海出费用表同一套口径：**先查汇率表当前生效记录 → 再兜底本位币 1 → 都不满足就置空**。

# 核心逻辑变更

## 新增 `apps/web-antd/src/utils/exchange-rate-cache.ts`

进程内共享的汇率缓存，数据源为 `ExchangeRateAdmin/GetPagedListAsync`（`PageIndex=1`、`PageSize=1000` 一次拉全量）：

- **生效筛选**：`enable === true` 且当前时间落在 `startDate ~ endDate` 内（起止为空视为不限）；
- **同币别去重**：`sortId` 大者优先，其次 id 大者（雪花 id 按十进制字符串比大小，不做 `Number()`）；
- **收付取值**：应收（`paySide = 0`）取 `drValue`，应付（`paySide = 1`）取 `crValue`；
- 缓存以 `shallowRef(Map)` 承载，模板同步读取 `peekExchangeRate` 也能在加载完成后自动重渲；
- 并发调用共用同一次请求；请求失败**不落缓存**，下次调用重试，本次按「未维护汇率」处理。

导出：`ensureExchangeRateCache(forceRefresh?)`、`peekExchangeRate(currencyId, paySide)`、`resolveExchangeRate(currencyId, paySide)`。

## `pre-order/modules/fee-table.vue`

- 去掉 `getExchangeRateDetail` 调用，`applyExchangeRate` 改为：币别为空 → 置空；命中汇率表 → 用生效汇率；未维护且是归属组织本位币 → 1；否则 → 置空（由用户手填）。
- `onMounted` 以 `ensureExchangeRateCache(true)` 刷新一次缓存，避免用上一次会话的旧汇率。
- 汇率输入框的只读条件对齐应收应付费用表：改用行标记 `__isLocalCurrency`（由 `applyExchangeRate` 在走本位币兜底时置 `true`、取到汇率表值时置 `false`），**只有兜底为 1 的行**禁用，汇率表里维护过的本位币汇率仍可手改。该字段为 UI 私有标记，`editor.vue` 组装 `preOrderFees` 时解构剔除，不进提交 payload。
- `localCurrencyId` 变化重刷全表汇率的 watch 增加 `readonly` 守卫，与 `syncDerivedRows` 一致——待审核 / 通过状态如实展示已落库的汇率，不再被改写（否则未维护汇率的行会被清空）。

# 避坑指南

- **不要再用 `getExchangeRateDetail(currencyId)` 取汇率**：该接口按汇率记录主键取数，币别 id 只是碰巧能命中，且不校验启用与有效期。
- **dr / cr 别再取反**：`drValue` = 应收汇率，`crValue` = 应付汇率（见 `FeeCodeAdminApi.ExchangeRateSimpleDto` 注释与海出 `useDropdownSources`）。本次一并纠正了联系单侧取反的历史写法，同一票费用在联系单与转出的海运出口费用上汇率才会一致。
- **置空是预期行为**：币别在汇率表里没有生效记录、又不是本位币时汇率留空，提交审核前不会被拦（体检只卡收付 / 费用代码 / 币别 / 单位），需要业务侧自行补维护或手填。
- 汇率缓存是模块级的，基础资料里改完汇率需重新进入编辑页（`onMounted` 强制刷新）才会生效，同一页面停留期间不会自动感知。
- 海运出口应收应付表仍用 `useDropdownSources` 内的私有缓存，本次未合并，后续如要统一可让其改调本工具。
