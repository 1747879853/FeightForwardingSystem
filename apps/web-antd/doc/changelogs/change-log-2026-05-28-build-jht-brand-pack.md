# 津海通（jht）独立打包命令与品牌环境

## 背景意图

- 同一前端需支持「浩瀚远洋」与「金海通」两套部署：接口地址、系统名称、Logo 互不干扰。

## 核心逻辑变更

- 新增 `pnpm build:jht`（`--mode jht`），根目录可用 `pnpm build:antd:jht`。
- 新增 `.env.jht`：`VITE_APP_TITLE=金海通`、`VITE_GLOB_API_URL=http://192.144.212.84:150/api`、`VITE_APP_NAMESPACE=vben-web-antd-jht`。
- 新增 `src/utils/brand-assets.ts`，按 `VITE_APP_BRAND=jht` 切换 `src/assets/img/jht/` 下 Logo。
- `vite.config.mts` 按 mode 同步首屏 Loading Logo；`dev:jht` / `build:jht` 时代理指向金海通接口。

## 避坑指南

- 请将 `src/assets/img/jht/` 内 `logo.png`、`logo-text.png`（及可选 `favicon.png`）替换为金海通正式素材；当前为占位拷贝，仅保证可编译。
- 修改 `.env.jht` 后需重新执行打包；本地调试金海通可用 `pnpm dev:jht` 或 `pnpm dev:antd:jht`。
