---
title: 无时分日期筛选统一按自然日闭区间提交
module: 共享能力
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 背景意图 (Background)

无时分 RangePicker / DatePicker 点「今天」会带上当前时钟，原先直接 `toISOString()` 会把起止打成同一时刻（如 `2026-09-08T05:38:43.101Z`），当天数据查不全。海运出口开船日期已按自然日修复，同类筛选一并改掉。

# 2. 核心逻辑变更 (Core Logic)

抽出 `apps/web-antd/src/utils/date-range-iso.ts`：

- 无时分：开始 `startOf('day')`，结束 `endOf('day')`，再转 ISO。
- 月份：`startOf('month')` / `endOf('month')`。
- 带 `showTime` 的区间仍原样转 ISO。

覆盖：海运进口到港及作业日期、空运出口日期、业务联系单开船日期、费用锁定业务日期、付费申请/付款审核/开票申请/业务联系单审核的日期条件、添加费用与对账单选费、收费核销选费与选开票申请、付费结算选申请的最晚付款、工作台审核筛选 ETD/提交时间。

# 3. 避坑指南 (Pitfalls)

- 只改无时分筛选。截单、结算时间、付费结算抽屉「提交时间」（`showTime: true`）不要切日界。
- UTC 的 `Z` 看起来像差 8 小时是正常的：本地 9 月 8 日 00:00 对应 `2026-09-07T16:00:00.000Z`。
- 起止选同一天时，起止 ISO 不应相同。
- 带时分选「今天 8:30」会发成 `T00:30:00.000Z`，这是同一瞬间的 UTC 写法。后端 `Clock.Provider = Local`，查询绑定走 `AbpDateTimeModelBinder` → `ToLocalTime()`，会回到本地 8:30，不是被改成别的钟点。
