---
title: 运踪严重异常类型改红色
date: 2026-09-21
module: shared
---

# 背景意图

运踪预警原先不分类型，列表叹号和提示一律黄色。`DUMPING` / `DETENTION` / `DELAY` / `OVERDUE` 属于延误、甩柜、滞留、超期，需要和开港截港等 `CHANGE` 区分开。

# 核心逻辑变更

- 新增 `warning-category.ts`：上述四类（大小写不敏感）走 `#ff4d4f`，其余含 `CHANGE` 仍用原黄 `#faad14`。
- 列表主提单号/主运单号叹号按最近一条 `latestWarningCategory` 着色。
- 异常预警弹窗的「预警类型」列对这四类标红；运踪详情摘要 Alert 改为 `error`。

# 避坑指南

- 列表只能看到最近一条的类型，同一票既有 DELAY 又有 CHANGE 时，叹号颜色跟最近一条走。
- 前端不翻译 DELAY 等英文码，也不按 ETD-48h 自己算规则，只给服务商推过来的 `eventCategory` 上色。
