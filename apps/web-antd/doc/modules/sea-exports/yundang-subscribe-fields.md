---
title: 海运出口运踪订阅 — 后端返回字段（前端实际使用）
module: 海运出口 / 运踪订阅
author: auto-doc-sync
last_updated: 2026-07-25
---

# 运踪订阅用到的后端返回字段

接口：`BatchSubscribeOceanBillAsync`；状态另来自列表/详情 `SeaExportDto`。

## 1. 订阅接口响应 `YundangOceanBatchSubscribeResultDto`

| 字段           | 用途                 |
| :------------- | :------------------- |
| `totalCount`   | toast / 结果弹窗汇总 |
| `successCount` | toast / 结果弹窗汇总 |
| `failCount`    | toast / 结果弹窗汇总 |
| `items`        | 结果表格明细         |

## 2. 明细 `items[]`（仅列出前端读到的）

| 字段           | 用途                                                |
| :------------- | :-------------------------------------------------- |
| `seaExportId`  | 关联列表行；拼 rowKey / 委托展示回退                |
| `referenceNo`  | 结果表「订阅单号」列                                |
| `ctnrNo`       | 结果表「箱号」列；拼 rowKey                         |
| `isSuccess`    | 结果表状态 Tag；toast 成败判断依赖汇总字段          |
| `resultType`   | 结果表「结果类型」列；`errorMessage` 为空时兜底展示 |
| `errorMessage` | 结果表「失败原因」列                                |

> DTO 另有 `localKey` / `carrierCd` / `yundangId` / `resultTypeCd` / `trackStatus` / `error`，前端订阅流程**未使用**。

## 3. 列表 / 详情状态字段（`SeaExportDto`）

| 字段 | 用途 |
| :-- | :-- |
| `isYundangSubscribed` | 是否已发起订阅 |
| `isYundangSubscribeSuccess` | 当前订阅是否成功；与上一字段组合为 none / failed / success（控制按钮文案与禁用） |
