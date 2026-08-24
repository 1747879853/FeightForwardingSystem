# 撤回津海通生产接口 HTTPS 域名替换

## 背景意图

`7fecc5c4` 将津海通 `VITE_GLOB_API_URL` 改为 `https://api.jinhaitone.com/api` 并已发布。现按要求撤回该替换，打包接口改回原地址 `http://43.138.14.122:82/api`，再单独发布一次 jht。

## 核心逻辑变更

- `.env.jht` 的 `VITE_GLOB_API_URL` 改回 `http://43.138.14.122:82/api`。
- `vite.config.mts` 的 `dev:jht` 代理目标改回 `http://43.138.14.122:82`。

## 避坑指南

- 撤回后必须重新执行 `pnpm build:antd:jht`（或 GitHub Actions jht workflow）再发布，否则线上 `_app.config.js` 仍指向 `api.jinhaitone.com`。
- 历史记录见 [change-log-2026-08-24-jht-api-https-domain.md](./change-log-2026-08-24-jht-api-https-domain.md)。
