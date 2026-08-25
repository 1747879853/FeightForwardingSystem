# 本地开发后端改到金海通同机 88 端口

## 背景意图

浩瀚远洋后端已迁到 `43.138.14.122:88`，旧机 `118.190.1.4:82` 停用。本地默认开发（`pnpm dev:antd`）和小程序开发仍指向旧地址，需要一并切过去。

## 核心逻辑变更

- `.env.development` 的 `VITE_GLOB_STATIC_URL` 改为 `http://43.138.14.122:88`（打印 PDF / 附件静态根）。
- `vite.config.mts` 未匹配品牌时的开发代理默认目标改为 `http://43.138.14.122:88`（覆盖 `pnpm dev:antd`）。
- `apps/mp/.env.development` 的 `VITE_API_ORIGIN` 改为 `http://43.138.14.122:88`。
- 津海通 `:82`、世纪通达 `:84`、佳越打包 `:85`、演示 `:86`、龙山独立机未改。

## 避坑指南

- 改完后需重启 `pnpm dev:antd` / 小程序开发服务，Vite 不会热更新 `.env` 与代理目标。
- `pnpm dev:jht` / `dev:sjtd` / `dev:longshan` / `dev:jiayue` 仍走各自 `.env.*` 与代理分支，不会跟到 `:88`。
