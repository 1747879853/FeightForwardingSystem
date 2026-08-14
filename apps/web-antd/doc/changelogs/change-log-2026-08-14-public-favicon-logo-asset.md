---
title: 更新 public 默认 favicon 与 logo 资源
date: 2026-08-14
module: shared
---

# 背景意图

替换站点稳定路径下的默认品牌位图，使浏览器标签（favicon）与侧栏/偏好回退的 `/logo.png` 与最新品牌视觉一致。

# 核心逻辑变更

- 更新 `apps/web-antd/public/favicon.png`（6073 → 125857 bytes）
- 更新 `apps/web-antd/public/logo.png`（6073 → 125857 bytes）
- 无代码逻辑变更；既有 `brand-assets` / `sync-loading-logo` 仍按稳定路径加载

# 避坑指南

- 验收请求应为 `http://<站点>/logo.png`、`/favicon.png`，而非带 hash 的打包路径
- 本地若有强缓存，硬刷新或清站点缓存后再看标签图标与侧栏 Logo
