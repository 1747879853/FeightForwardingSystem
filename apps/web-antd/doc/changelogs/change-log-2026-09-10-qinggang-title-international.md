---
title: 青港站点对外文案改为青港国际
date: 2026-09-10
module: brand-pack
---

# 背景意图

青港品牌对外名称应为「青港国际」，与 Logo 文案一致。原先 `.env.qinggang` 的 `VITE_APP_TITLE` 写成「青港」，浏览器标签、登录页应用名、侧栏折叠标题都会显示成短名。

# 核心逻辑变更

- `.env.qinggang` 的 `VITE_APP_TITLE` 改为「青港国际」，经 `preferences.ts` 的 `app.name` 注入登录页、布局与 `index.html` 标题
- `scripts/sites.json` 青港条目的 `name` / `title` 同步为「青港国际」，发布后健康检查按新标题核对

# 避坑指南

- 改 `VITE_APP_TITLE` 后硬刷新即可；`app.name` 已强制跟构建期值，不必再清整个 localStorage
- 已发布站点须重新 `pnpm build:antd:qinggang` 再发布
- 别名仍是 `qinggang`，IIS 站点名仍是 `qinggang-web`，不要跟着改成 international
