---
title: 付费申请币别展示统一为英文代码
module: 费用管理 / 付费申请
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

付费申请新建抽屉「原始币别」及「人民币未收」等动态列出现中文币别名，需统一为 `RMB` / `USD`（TAPD #0691）。

# 2. 核心逻辑变更 (Core Logic)

1. 新增 `fee-management/utils/currency-display.ts`：`toCurrencyDisplayCode`，优先英文 code，中文名映射（如人民币→RMB）。
2. 付费申请表单、添加费用抽屉在选费、汇总、表头、Tag 展示处统一走该函数。
3. `resolveFeeCurrencyCode` 同样归一化，避免 code 为空时回退中文名。

# 3. 避坑指南 (Pitfalls)

- 映射表仅覆盖常见币别；未知中文名仍会原样展示，需补映射或保证后端返回 `code`。
- 若后端已返回 `CNY`，会按英文代码原样展示，不会强转 `RMB`（仅「人民币」映射为 RMB）。
