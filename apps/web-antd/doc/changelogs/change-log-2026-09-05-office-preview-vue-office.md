# Office 预览改用 vue-office 本地渲染

## 背景意图

微软 `view.officeapps.live.com` 要求 `src` 为公网 HTTPS、标准端口、最好是域名。当前品牌附件在 `http://IP:84/Uploads/...`，文件本身能下载，但微软一直停在 “We're fetching your file...”。改为浏览器内开源预览，由前端 fetch 文件后本地渲染，不再让微软服务器去拉文件。

## 核心逻辑变更

1. **接入 [vue-office](https://github.com/501351981/vue-office)**
   - `@vue-office/excel`：`.xls` / `.xlsx` / `.csv`
   - `@vue-office/docx`：`.docx`
   - `@vue-office/pptx`：`.pptx`
   - 旧版 `.doc` / `.ppt` 仍提示下载（库不支持二进制旧格式）。
2. **同源拉取**
   - 新增 `resolveSameOriginMediaUrl`：把后端静态文件改成 `/Uploads/...` 相对路径，走 Vite `/Uploads` 代理（生产走同机反代），避开 CORS 与 `X-Frame-Options: SAMEORIGIN`。
   - 预览 fetch ArrayBuffer 传给 vue-office；PDF iframe 也改同源地址。
3. **下载 / 新窗口**仍用 `buildAttachmentUrl` 直连后端，不走微软嵌入。

## 避坑指南

- **不要再用微软 embed 预览内网/HTTP/非 80·443 端口文件**：那是微软机房去 GET，不是用户浏览器。
- **vue-office 不是排版 100% 还原**：复杂宏、VBA、部分样式会丢；以下载后用 Office 打开为准。
- **旧版 `.xls`（OLE）不能直接喂给 vue-office**：见 [change-log-2026-09-05-excel-xls-ole-preview.md](./change-log-2026-09-05-excel-xls-ole-preview.md)。
- **开发环境依赖 `/Uploads` 代理**：`vite.config.mts` 已有；生产前端域名若与附件域名不同，同样需要反代 `/Uploads`，否则 fetch 会 CORS 失败。
