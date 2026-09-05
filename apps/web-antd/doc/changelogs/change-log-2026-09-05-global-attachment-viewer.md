# 全局附件查看器

## 背景意图

业务页查看附件原先有两套做法：海出/海进/空出/客户附件 Tab 各自挂 `AttachmentViewerModal`；付费申请、审批、开票、公告等则 `window.open` 新窗口。Office 文档还需要公网可访问地址才能走微软在线嵌入。目标是做成全站单例查看器：任意页面调用 `openAttachmentViewer` 即可预览，相对路径统一拼当前品牌后端根，不再写死外部站点域名。

## 核心逻辑变更

1. **公网地址与预览 URL 工具**（`src/utils/attachment-url.ts`）
   - `resolvePublicMediaUrl` / `resolveMediaUrl`：相对路径拼 `VITE_GLOB_STATIC_URL` 或 `VITE_GLOB_API_URL` 去 `/api` 后的后端根；若已是前端 origin（含 localhost）则改写到后端。
   - `buildOfficeEmbedUrl`：`view.officeapps.live.com/op/embed.aspx?src=` + 公网地址。
   - `buildDocumentPreviewUrl`：PDF 直链，其它 Office 走嵌入。
2. **全站单例弹窗**
   - `src/components/attachment-viewer/`：模块级状态 + `openAttachmentViewer`。
   - `app.vue` 挂 `AttachmentViewerHost`，与打印/轨迹弹窗同一模式。
   - 图片 / PDF 在弹窗内预览；Word/Excel/PPT 走微软嵌入（src 必须是品牌后端公网地址）。
3. **接入点**
   - 付费申请、付费审批、开票、公告、业务联系单、结算单等由新窗口改为弹窗。
   - 海出/海进/空出/客户附件 Tab 不再各自挂 Modal，改为调用全局打开。
   - `FileUploadInput` 预览（含非图片）同样走全局查看器。

## 避坑指南

- **不要再手写 `window.open(buildAttachmentUrl(url))` 做预览**：下载仍可用原 URL；预览请调 `openAttachmentViewer(item)` 或传入 URL 字符串。
- **Office 预览依赖公网后端**：微软服务器会拉取 `src`，localhost / 前端端口无效。开发环境必须配 `VITE_GLOB_STATIC_URL`（当前品牌后端，如 hhyy 的 `http://47.105.61.173:84`）。
- **HTTP 后端可能被微软拒绝**：Office Online 更倾向 HTTPS 公网文件；内网或纯 HTTP 时弹窗可能空白，可改「新窗口打开 / 下载」。
- **调用方可直接传附件 DTO**：识别 `url` / `fileUrl`、`friendlyFileName` / `fileName`、`creatorUserName`、`creationTime`。
