# 小程序开发态后端改到津海通 :82

## 背景意图

小程序 AppId 已是津海通，但开发态 `VITE_API_ORIGIN` 仍指向佳越测试 `:88`。微信登录与监装接口应对齐津海通后端。

## 核心逻辑变更

- `apps/mp/.env.development` 的 `VITE_API_ORIGIN` 改为 `http://43.138.14.122:82`，与 `.env.jht` 同源。
- 未改 `.env.production`（仍为 https 合法域名占位，真机发布前再填）。
- 未改管理端本地默认 `pnpm dev:antd`（仍走佳越测试 `:88`）。

## 避坑指南

- Vite 不会热更新 `.env`，改完后须重启 `pnpm --filter @vben/mp run dev:mp-weixin`。
- 微信开发者工具开发态连 http 须勾「不校验合法域名」。
- 津海通 `:82` 与佳越测试 `:88`、浩瀚远洋 `47.105.61.173:84` 不要混用。
