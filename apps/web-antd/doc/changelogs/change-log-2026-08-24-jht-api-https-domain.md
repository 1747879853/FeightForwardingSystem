# 津海通生产接口改为 https://api.jinhaitone.com

## 背景意图

津海通前端站点已走 HTTPS（`https://jht.jinhaitone.com`），生产接口仍指向 `http://43.138.14.122:82/api` 会被浏览器按混合内容拦截。后端已为同一主机签发 `*.jinhaitone.com` 证书并绑定 `api.jinhaitone.com`。

## 核心逻辑变更

- `.env.jht` 的 `VITE_GLOB_API_URL` 改为 `https://api.jinhaitone.com/api`，打包后写入 `dist/_app.config.js`。
- `vite.config.mts` 的 `dev:jht` 代理目标同步为 `https://api.jinhaitone.com`（附件、打印、UserConfiguration 等同机路径）。
- 实测：域名解析到原 `43.138.14.122`；`Session/GetCurrentLoginInformations` 与旧 `:82` 返回同一份 ABP JSON；CORS 已允许 `https://jht.jinhaitone.com`。

## 避坑指南

- 津海通打包仍须使用 `pnpm build:jht` / `pnpm build:antd:jht`，不要直接 `pnpm vite build --mode jht`，否则 `_app.config.js` 会回退读 `.env.production`。
- 发布后打开站点应看到请求发往 `https://api.jinhaitone.com/api/...`，而不是 `43.138.14.122:82`。
- 本地 `dev:jht` 走绝对 API 地址时，Origin 需在后端 CORS 白名单内；生产站点已在白名单。
