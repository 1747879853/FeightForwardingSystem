# 浩瀚远洋生产接口改到 47.105.61.173:84

## 背景意图

浩瀚远洋后端迁到独立机 `47.105.61.173`，端口使用 `84`，不再与津海通同机 `:88`。

## 核心逻辑变更

- `.env.hhyy`、`.env.production` 的 `VITE_GLOB_API_URL` 改为 `http://47.105.61.173:84/api`。
- `.env.hhyy` 的 `VITE_GLOB_STATIC_URL` 改为 `http://47.105.61.173:84`，打印/附件静态根与接口同机。
- `vite.config.mts` 的 `dev:hhyy` 代理目标改为 `http://47.105.61.173:84`。

未改本地默认 `pnpm dev:antd`（佳越）、小程序开发态、以及世纪通达同端口 `:84`（`43.138.14.122`）。

## 避坑指南

- 必须重新执行 `pnpm build:antd:hhyy`（或 GitHub Actions hhyy workflow）再发布，否则线上 `_app.config.js` 仍指向 `43.138.14.122:88`。
- 浩瀚远洋 `:84` 在 `47.105.61.173`，世纪通达 `:84` 在 `43.138.14.122`，不要按端口混用。
- 误用 `pnpm vite build --mode jht` 时仍会回退 `.env.production`，此时 API 会变成浩瀚远洋新地址 `47.105.61.173:84`，不是津海通 `:82`。
