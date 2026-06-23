# 公告登录弹窗富文本附件路径拼接

## 背景意图

富文本编辑器上传图片后 HTML 保存的是相对路径（如 `/Uploads/document/20260623/xxx.png`）。登录弹窗用 `v-html` 直接渲染时，浏览器无法从当前前端域名加载这些资源。

## 核心逻辑变更

- 在 `src/utils/sanitize-html.ts` 新增 `renderAnnouncementHtml`：先 `sanitizeAnnouncementHtml` 消毒，再对 `img[src]`、`a[href]`、`[data-href]` 调用 `buildAttachmentUrl` 拼接完整地址。
- `announcement-login-modal.vue` 展示富文本时改用 `renderAnnouncementHtml`，与附件列表下载区共用同一套 URL 规则（`VITE_GLOB_API_URL` 去掉 `/api` 后与相对路径拼接）。

## 避坑指南

- 仅展示层做路径改写，后端仍存相对路径；编辑表单无需改动。
- 已是 `http(s)://`、`//`、`blob:`、`data:` 的 URL 不会被 `buildAttachmentUrl` 二次拼接。
