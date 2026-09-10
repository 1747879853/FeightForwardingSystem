---
title: 新增青港、青岛海鼎、山东金冠独立打包与本地发布
date: 2026-09-10
module: brand-pack
---

# 背景意图

后端已把青港、青岛海鼎、山东金冠接入自动发布（别名 `qinggang` / `qdhd` / `sdjg`，独立机 API 均为 `:86`）。前端需同步独立构建 mode、发布命令、后端 API 地址与 Logo 目录，才能一键发到对应 IIS Web 站点。

# 核心逻辑变更

- 新增 `.env.qinggang` / `.env.qdhd` / `.env.sdjg`，标题分别为「青港」「青岛海鼎」「山东金冠」
- 生产 API：
  - 青港 `http://47.104.86.183:86/api`
  - 青岛海鼎 `http://47.104.99.3:86/api`
  - 山东金冠 `http://47.104.99.109:86/api`
- 根目录命令：`dev:antd:*` / `build:antd:*` / `deploy:antd:*`（`qinggang` / `qdhd` / `sdjg`）
- 本地 `publish-web.ps1` / `deploy:antd:all` 纳入这三套；IIS 站点名分别为 `qinggang-web` / `qdhd-web` / `sdjg-web`，Web 约定端口 `:186`
- `brand-assets.ts` 与 `vite.config.mts` 注册 `src/assets/img/qinggang|qdhd|sdjg/`；当前 Logo 为占位拷贝，须换成正式素材
- `scripts/sites.json` 增加三站健康检查预期值

# 避坑指南

- 别名必须与后端 `deploy-config.json` 一致：`qinggang`、`qdhd`、`sdjg`，不要写成 haiding / jinguan
- **禁止**直接执行 `pnpm vite build --mode qinggang`（或 qdhd / sdjg）：须用 `pnpm build:antd:qinggang` 等 script，否则 `_app.config.js` 可能误读 `.env.production`
- IIS 站点名是 `*-web`，不要发到后端 API 站点 `qinggangApi` / `qdhdApi` / `sdjgApi`
- 发布前服务器上须先建好 `qinggang-web` / `qdhd-web` / `sdjg-web` 并开放 `:186`
- Logo 目前是占位图，换正式素材后重新打包才会进 `dist`
