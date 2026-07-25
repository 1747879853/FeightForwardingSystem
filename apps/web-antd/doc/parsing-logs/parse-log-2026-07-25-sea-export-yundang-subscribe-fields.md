---
title: 海运出口运踪订阅字段梳理
module: 海运出口 / 运踪订阅
author: auto-doc-sync
last_updated: 2026-07-25
---

# 1. 解析目标

梳理海运出口「运踪订阅」链路实际使用的字段（请求、后端隐式读取、前端行上下文、状态回读、响应与结果弹窗），沉淀为独立字段清单文档，便于联调与排错。

# 2. 核心逻辑梳理 / 发现的文档偏差

## 2.1 当前代码事实

- 提交契约 `YundangOceanBatchSubscribeInputDto` **仅** `seaExportIds: string[]`。
- `useYundangOceanSubscribe.subscribe` 直接调 `batchSubscribeOceanBill`，无二次确认、无 scene/referenceType/noticeEmail。
- 列表用 `buildSeaExportSubscribeRow` 带上 `id/commissionNum/mblNum/bookingNum`，**仅结果 Modal 拼 orderLabel**，不进请求体。
- 状态用 `isYundangSubscribed` + `isYundangSubscribeSuccess` 组合推导 `none/failed/success`。

## 2.2 与早期变更文档的关系

- 2026-07-07 简化说明：后端按装运方式自动订阅（整箱→船公司+主提单号；其他→船公司+第一个箱号）。前端文档此前散落在 changelog，缺少集中字段表。
- 早期「参数弹窗配置单号类型」描述已过时；以简化后契约为准。

## 2.3 产出

独立活文档已精简为「仅后端返回且前端实际使用」字段表：[运踪订阅字段清单](../modules/sea-exports/yundang-subscribe-fields.md)。

# 3. 架构洞察

- 订阅响应用：汇总三计数字段 + `items` 中 `seaExportId/referenceNo/ctnrNo/isSuccess/resultType/errorMessage`。
- 状态回读用：`isYundangSubscribed` + `isYundangSubscribeSuccess`。
