---
title: 附件预览生产环境不再先打前端 /Uploads
date: 2026-09-06
module: shared / attachment-viewer
---

# 背景意图

开发时 Vite 把 `/Uploads` 代理到后端，预览可以先同源 fetch。生产各品牌前端与 API 不在同一域名/端口（如 `admin.jinhaitone.com` vs `api.jinhaitone.com`，或 `:184` vs `:84`），站点上也没有 `/Uploads` 反代。`resolveSameOriginMediaUrl` 仍把后端地址改成相对路径，浏览器会先请求前端站点再 404，Office 预览再 fallback 打后端，Network 里两条。

# 核心逻辑变更

- 仅 `import.meta.env.DEV` 时把后端 `/Uploads` 改写成当前页相对路径（走 Vite 代理）。
- 生产前后端不同源时保持 `buildAttachmentUrl` 的后端绝对地址，预览只打一次。
- 当前页已经就是文件 origin 时仍用相对路径。

# 避坑指南

- 不要假设生产 nginx 会转 `/Uploads`；本仓库品牌部署都是静态站点 + 独立 API。
- 下载、图片 `src` 本来就走后端，不受这次影响。
- 生产 Office `fetch` 依赖后端静态文件 CORS；PDF iframe 若被 `X-Frame-Options` 拦住，需要后端放行或改 blob 预览，不能再靠前端反代。
