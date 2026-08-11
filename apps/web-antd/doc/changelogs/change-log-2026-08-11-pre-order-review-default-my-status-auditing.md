---
title: 业务联系单审核默认筛选我的审核状态为审核中
date: 2026-08-11
module: audit-approval
---

# 背景意图

进入「业务联系单审核」时，「我的审核状态」原先为空，列表混有已通过等记录。审核人首屏应默认看待办（审核中）。

# 核心逻辑变更

`apps/web-antd/src/views/audit-approval/pre-order-review/data.ts`：

- `MyStatus` 增加 `defaultValue: 0`（审核中）
- 首屏查询与点「重置」都会回到该默认值

# 避坑指南

- 筛的是任务侧 `MyStatus`，不是单据 `PreOrderStatus`（待审核）；文案「审核中」对应任务枚举 `0`
