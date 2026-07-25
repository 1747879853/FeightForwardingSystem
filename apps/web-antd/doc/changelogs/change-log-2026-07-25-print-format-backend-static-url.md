# 打印文件地址强制走后端端口-2026-07-25

## 背景意图

打印预览/导出曾优先用同源相对路径 `/PrintTempFile`（落在前端端口，如 `localhost:5010`），或在未配静态根时回退 `window.location.origin`，导致 PDF 打到前端而非后端。打印静态文件必须直连后端端口。

## 核心逻辑变更

1. `buildStaticFileUrl` / `getStaticFileOrigin`：只接受绝对后端根（开发优先 `VITE_GLOB_STATIC_URL`，否则从绝对 `VITE_GLOB_API_URL` 推导）；**禁止**回退前端 origin。
2. `downloadPrintFile`：去掉同源代理候选，仅 fetch 后端绝对 URL（原始文件名 → 清洗名）。

## 避坑指南

- 开发态 `VITE_GLOB_API_URL=/api` 时必须配 `VITE_GLOB_STATIC_URL` 指向真实后端（如 `http://118.190.1.4:82`）。
- iframe 预览跨域不受 CORS 限制；`fetch` 静默下载依赖后端对 `/PrintTempFile` 放开 CORS。
- vite 仍可保留 `/PrintTempFile` 代理供其他用途，但打印链路不再使用。
