---
title: 站点名强制跟构建期 VITE_APP_TITLE
date: 2026-09-10
module: preferences
---

# 背景意图

青港 `VITE_APP_TITLE` 已改为「青港国际」，登录页 HTML 标题能对上，但登录后页签/侧栏仍显示「青港」。`initPreferences` 用 defu 合并时 **localStorage 缓存优先**，上一包写入的 `app.name` 会粘住。

# 核心逻辑变更

- `packages/@core/preferences` 的 `initPreferences` 在合并缓存后，强制回写 `overrides.app.name`（与 Logo 同源处理）
- 构建期站点名始终跟 `.env.*` 的 `VITE_APP_TITLE`，改标题后刷新即可，不必清缓存

# 避坑指南

- 这只钉死 `app.name`。布局、主题等其它偏好仍走缓存
- 已打开的页签若仍是旧标题，硬刷新一次即可；不必再清整个 localStorage
