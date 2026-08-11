# 品牌 Logo 避免 preferences 缓存 hash 路径 404

## 背景意图

龙山线上出现 `GET /png/logo-GZsaIQKl.png 404`：侧栏 Logo 曾走 vite 带 hash 的地址，偏好 localStorage 粘住上一包路径，换包后文件名对不上。

## 核心逻辑变更

1. **`brandLogo` 改用 public 稳定路径** `/logo.png`（佳越为 `/logo.webp`）；`vite.config.mts` 的 `sync-loading-logo` 在 `buildStart` 把当前品牌 `logo.png|webp` 拷到 `public/`。
2. **`initPreferences`** 合并缓存后仍强制回写 `overrides.logo`（双保险，清掉历史 hash URL）。

## 避坑指南

- 验收请求应为 `http://<站点>/logo.png`，不应再是 `/png/logo-<hash>.png`。
- 发布时确认 dist 根目录含 `logo.png`（与 `favicon.png`、`logo-text.png` 同级）。
- 临时绕过旧包：清站点 localStorage（如 `vben-web-antd-longshan-*`）或偏好「清空并退出」。
