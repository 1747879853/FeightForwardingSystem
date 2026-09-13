---
title: 船期查询入口切换为飞驼 Web SDK
date: 2026-09-13
module: schedule-query
---

# 背景意图

自建船期工作台与飞驼官方查询在方案分组、共舱展示上持续存在口径差。当前先把 `/schedule` 切到对方 Web SDK，让业务直接使用官方船期界面；原 `list.vue` 与分组逻辑完整保留，便于后续恢复。

# 核心逻辑变更

1. **路由入口：** `freight-rate.ts` 的船期查询组件由 `list.vue` 改为 `sdk.vue`。`sdk.vue` 用全高 iframe 打开 `public/schedule-sdk.html`，避免 SDK 的 `#app` 挂载、全局样式和 hash 路由污染主应用。
2. **独立 HTML：** 开发时 Vite SPA fallback 会把 `schedule-sdk.html` 重写成主应用文档，因此增加 `scheduleSdkPagePlugin`，在 fallback 之前按静态 HTML 返回该文件。`scripts/verify-schedule-sdk.ps1` 用浏览器 `Accept: text/html` 校验不会回退到 `/src/main.ts`。
3. **SDK 初始化：** 父页通过 `postMessage`（`schedule-sdk-init`，同源）把 `VITE_GLOB_FREIGHTOWER_SCHEDULE_KEY` 传给 iframe；只开船期、隐藏导航，`mounted` 后切中文。密钥缺失、加载失败或 30 秒超时显示重试。
4. **恢复方式：** 将 `freight-rate.ts` 的组件导入改回 `#/views/schedule-query/list.vue` 即可回到原工作台。

# 避坑指南

- 密钥只放环境变量，不要写进 `schedule-sdk.html`。父页必须等 iframe `load` 后再 `postMessage`，且校验 `event.origin` / `event.source`。
- 开发环境访问 `/schedule-sdk.html` 必须走 `scheduleSdkPagePlugin`；只靠 `publicDir` 会被 history fallback 吃掉，iframe 里会跑主应用。
- SDK 可能在导航后再次插入对方客户图 `wy3.png`，宿主页用 MutationObserver 持续移除，不能只靠一条 CSS。
