# 世纪通达（sjtd）独立打包命令与品牌环境

## 背景意图

- 同一前端需支持「世纪通达」独立部署：接口地址、系统名称、Logo 与其他品牌隔离。

## 核心逻辑变更

- 新增 `pnpm build:sjtd`（`--mode sjtd`），根目录可用 `pnpm build:antd:sjtd`。
- 新增 `.env.sjtd`：`VITE_APP_BRAND=sjtd`、`VITE_APP_TITLE=世纪通达`、`VITE_APP_NAMESPACE=vben-web-antd-sjtd`。
- 生产 API：`http://43.138.14.122:84/api`；`dev:sjtd` 时代理指向同主机 `:84`。
- `src/utils/brand-assets.ts` 与 `vite.config.mts` 注册 `src/assets/img/sjtd/` 品牌素材。
- 本地调试可用 `pnpm dev:sjtd` 或 `pnpm dev:antd:sjtd`。

## 避坑指南

- 修改 `.env.sjtd` 后需重新执行打包。
- **禁止**直接执行 `pnpm vite build --mode sjtd`：须用 `pnpm build:sjtd` 或 `pnpm build:antd:sjtd`，否则 `_app.config.js` 可能误读 `.env.production`。
