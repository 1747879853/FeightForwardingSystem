# 变更记录：佳越 :85 站点标题改为「佳越标准库-禁止测试」

## 背景意图

`43.138.14.122:85` 是佳越独立后端，站点展示名需标明「标准库」并提示禁止当测试环境使用，避免与本地默认「佳越软件」、演示 `:86` 混淆。

## 核心逻辑变更

- `.env.jiayue` 的 `VITE_APP_TITLE` 由「佳越软件」改为「佳越标准库-禁止测试」。
- 品牌码仍为 `jiayue`，素材、namespace、API `:85` 不变。
- 对照文档 `doc/guides/brand-dev-build-commands.md` 已把 `:85` 从本地默认行拆出，并补入生产 API 表。

## 避坑指南

- 必须重新执行 `pnpm build:antd:jiayue` 再发布，否则线上 `_app.config.js` / 构建期注入的标题仍是「佳越软件」。
- 本地 `pnpm dev:antd`（`.env.development`）标题仍是「佳越软件」，不要当成 `:85` 生产包。
