---
title: 运踪订阅取消二次确认
module: 海运出口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-07-07
---

# 1. 背景意图 (Background)

**白话解释：** 运踪订阅操作应一键完成，无需弹出确认框。点击「运踪订阅」后直接调用接口，展示 loading 与结果。

# 2. 核心逻辑变更 (Core Logic)

- 删除 `yundang-subscribe-modal.vue` 确认弹窗。
- `useYundangOceanSubscribe`：`openSubscribe` 改为 `subscribe()`，直接调 `batchSubscribeOceanBill`。
- 列表/编辑页按钮绑定 `:loading="subscribing"`；请求期间 `message.loading` 提示。
- 超过 30 票仍 toast 提示后端分批（非阻断）。
- 订阅完成后保留 toast 汇总 + 结果 Modal。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT] `subscribe()` 内置防重复提交（`subscribing` 锁），避免连点多次请求。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-07 | `Refactor` | 运踪订阅取消二次确认，点击即提交 | composable 收敛为 `subscribe` + `ResultModal` |
