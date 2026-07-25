# 变更记录：新增演示环境（demo，后端端口 86）

## 背景意图

需要独立对接演示后端 `43.138.14.122:86`，同时继续使用佳越软件 Logo 与素材，避免与正式品牌环境串配置、串本地缓存。

## 核心逻辑变更

- 新增 `apps/web-antd/.env.demo`：`VITE_APP_BRAND=jiayue` 复用佳越素材；`VITE_APP_TITLE=演示环境`；`VITE_APP_NAMESPACE=vben-web-antd-demo` 隔离缓存；API/静态资源指向 `:86`。
- 根目录与 `apps/web-antd` 增加 `dev:antd:demo` / `build:antd:demo`（及包内 `dev:demo` / `build:demo` / `prebuild:demo`）。
- 因 `VITE_APP_BRAND` 仍为 `jiayue`，无需改动 `brand-assets.ts` 与 `vite.config.mts` 的品牌映射。
- 对照文档 `doc/guides/brand-dev-build-commands.md` 已补充命令、env、API 表。

## 避坑指南

- 必须通过 `pnpm build:antd:demo` / `pnpm build:demo` 打包，勿直接 `pnpm vite build --mode demo`，否则 `_app.config.js` 可能回退读 `.env.production`。
- 演示环境与佳越共用素材目录，但 namespace 不同；切换环境后若界面异常，可清空当前站点 localStorage。
