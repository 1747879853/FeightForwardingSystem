---
title: 付费申请审批列表默认筛审核中
date: 2026-08-31
module: audit-approval / payment-review
---

# 背景意图

付费申请审批列表打开后未带任务状态，已通过、已驳回和待审混在一起。审核人进页时期望先看待审单。

# 核心逻辑变更

- `usePaymentReviewFormSchema` 的 `TaskStatus` 增加 `defaultValue: TaskStatus.Auditing`（0）。
- 首屏查询和点重置都会带上「审核中」；筛选项可清空后查看全部状态。

# 避坑指南

- `TaskStatus.Auditing` 的值是 `0`，请求层不要把 `0` 当空值丢掉，否则默认筛选会失效。
- 「我的审核状态」`MyStatus` 本次不默认，避免和任务状态叠两层筛掉待本人处理但整单仍在审的单子。
