# 变更记录：新增佳越测试环境（jytest，后端端口 88）

## 背景意图

浩瀚远洋后端已迁到 `47.105.61.173:84`，`43.138.14.122:88` 改为佳越测试后端。站点展示名需为「佳越测试」，图标与 Logo 使用佳越素材，并与 `:85` 佳越标准库、`:86` 演示环境隔离。

## 核心逻辑变更

- 新增 `apps/web-antd/.env.jytest`：`VITE_APP_BRAND=jiayue` 复用佳越素材；`VITE_APP_TITLE=佳越测试`；`VITE_APP_NAMESPACE=vben-web-antd-jytest` 隔离缓存；API/静态资源指向 `:88`。
- 本地默认 `.env.development` 标题由「佳越软件」改为「佳越测试」，namespace 改为 `vben-web-antd-jytest`，与可打包测试环境一致。
- 根目录与 `apps/web-antd` 增加 `dev:antd:jytest` / `build:antd:jytest` / `deploy:antd:jytest`（及包内 `dev:jytest` / `build:jytest` / `prebuild:jytest` / `build-only:jytest`）。
- `publish-web.ps1` / `publish-all-web.ps1` / `publish-config.example.json` 纳入 `jytest`。
- `vite.config.mts` 的 favicon 同步增加 `logo.webp` 候选，避免佳越目录没有 `favicon.png`/`logo.png` 时浏览器标签仍停留在上一品牌图标。

## 避坑指南

- 必须通过 `pnpm build:antd:jytest` / `pnpm build:jytest` 打包，勿直接 `pnpm vite build --mode jytest`，否则 `_app.config.js` 可能回退读 `.env.production`（浩瀚远洋 `47.105.61.173:84`）。
- 佳越测试与佳越标准库共用素材目录，但 namespace 不同；切换环境后若界面异常，可清空当前站点 localStorage。
- 发布前确认 IIS 站点名（本地配置默认 `jiayue-web-test`，与 `jht-web-test` / `sjtd-web-test` 同类）已在服务器创建。
- 勿把 `:88` 佳越测试当成 `:85` 佳越标准库，后者标题为「佳越标准库-禁止测试」。
