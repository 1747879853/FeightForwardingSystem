---
title: 新增龙山（longshan）独立打包与开发环境
date: 2026-08-11
module: brand-pack
---

# 背景意图

同一前端需支持「龙山」独立部署：接口地址、系统名称、Logo 与其他品牌隔离。

# 核心逻辑变更

- 新增 `pnpm build:longshan`（`--mode longshan`），根目录可用 `pnpm build:antd:longshan`
- 新增 `.env.longshan`：`VITE_APP_BRAND=longshan`、`VITE_APP_TITLE=龙山`、`VITE_APP_NAMESPACE=vben-web-antd-longshan`
- 生产 API：`http://175.178.101.30:86/api`；`dev:longshan` 时代理指向同主机 `:86`
- `src/utils/brand-assets.ts` 与 `vite.config.mts` 注册 `src/assets/img/longshan/` 品牌素材
- 登录页背景视频 OSS：`https://oss.jiayuebetter.com/longshan.mp4`
- 本地调试可用 `pnpm dev:longshan` 或 `pnpm dev:antd:longshan`
- （已于 2026-08-17 接入）见 `change-log-2026-08-17-longshan-msdeploy-publish.md`

# 避坑指南

- 修改 `.env.longshan` 后需重新执行打包
- **禁止**直接执行 `pnpm vite build --mode longshan`：须用 `pnpm build:longshan` 或 `pnpm build:antd:longshan`，否则 `_app.config.js` 可能误读 `.env.production`
- OSS 对象名须为根路径 `longshan.mp4`（与代码直链一致）
