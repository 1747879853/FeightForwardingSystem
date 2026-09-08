---
title: 海运出口开船日期筛选按自然日闭区间提交
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 背景意图 (Background)

开船日期是无时分的 RangePicker。点「今天」时组件会把当前时钟写进 dayjs，再 `toISOString()` 后 `ETDStart`/`ETDEnd` 变成同一时刻（如 `2026-09-08T05:38:43.101Z`），当天整段开船数据都查不到。

# 2. 核心逻辑变更 (Core Logic)

- `ETDStart` 用本地 `startOf('day')` 再转 ISO。
- `ETDEnd` 用本地 `endOf('day')` 再转 ISO。
- 截单时间仍带时分，不改。

# 3. 避坑指南 (Pitfalls)

- 不要对开船日期直接 `dayjs(value).toISOString()`。
- UTC 看起来像「差 8 小时」是正常的：本地 9 月 8 日 00:00 对应 `2026-09-07T16:00:00.000Z`。
- 起止选同一天时，起止 ISO 不应相同。
