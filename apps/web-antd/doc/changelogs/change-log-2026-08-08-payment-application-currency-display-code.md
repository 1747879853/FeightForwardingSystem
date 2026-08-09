---
title: 付费申请币别展示统一为英文代码
module: 费用管理 / 付费申请
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

付费申请新建抽屉「原始币别」及「人民币未收」等动态列出现中文币别名，需统一为 `RMB` / `USD`（TAPD #0691）。

# 2. 核心逻辑变更 (Core Logic)

1. （历史）曾新增 `toCurrencyDisplayCode` 做中文名→代码硬编码映射。
2. **已废弃（2026-08-09）**：删除该工具函数，改为直读接口 `currency.code`。见 `change-log-2026-08-09-payment-application-currency-code-from-api.md`。

# 3. 避坑指南 (Pitfalls)

- 勿再恢复中文名硬编码表；展示以币别主数据 `code` 为准。
