---
title: 付费申请表单页增加底部间距
module: 费用管理 / 付费申请
author: auto-doc-sync
last_updated: 2026-08-09
---

# 1. 背景意图 (Background)

付款申请新增/编辑页滚到底部时内容贴边，需增加页面下边距以留出呼吸空间。

# 2. 核心逻辑变更 (Core Logic)

1. 共用表单容器 `.payment-app-form` 的 `padding-bottom` 由 `10px` 调整为 `48px`。
2. 新增页与编辑页共用 `form.vue`，两侧同步生效。

# 3. 避坑指南 (Pitfalls)

- 底部留白用容器 `padding-bottom`，勿再给费用明细卡片叠一层 `margin-bottom`，避免双重间距。
