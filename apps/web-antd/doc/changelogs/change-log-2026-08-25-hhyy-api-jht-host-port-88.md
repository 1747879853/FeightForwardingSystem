# 浩瀚远洋生产接口改到金海通同机 88 端口

## 背景意图

浩瀚远洋后端迁到与津海通同一台服务器 `43.138.14.122`，端口使用 `88`，与津海通 `:82`、佳越 `:85`、演示 `:86` 隔离。

## 核心逻辑变更

- `.env.hhyy`、`.env.production` 的 `VITE_GLOB_API_URL` 改为 `http://43.138.14.122:88/api`。
- `.env.hhyy` 补 `VITE_GLOB_STATIC_URL=http://43.138.14.122:88`，打印/附件静态根与接口同机。
- `vite.config.mts` 的 `dev:hhyy` 代理目标改为 `http://43.138.14.122:88`。

本地默认 `pnpm dev:antd` 随后也改到同一地址，见 [change-log-2026-08-25-dev-api-jht-host-port-88.md](./change-log-2026-08-25-dev-api-jht-host-port-88.md)。

## 避坑指南

- 必须重新执行 `pnpm build:antd:hhyy`（或 GitHub Actions hhyy workflow）再发布，否则线上 `_app.config.js` 仍指向 `118.190.1.4:82`。
- 误用 `pnpm vite build --mode jht` 时仍会回退 `.env.production`，此时 API 会变成浩瀚远洋新地址 `43.138.14.122:88`，不是津海通 `:82`。
