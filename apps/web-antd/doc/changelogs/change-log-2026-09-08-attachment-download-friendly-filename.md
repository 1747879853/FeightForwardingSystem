# 附件下载使用友好文件名

## 背景意图

付费申请等页面列表展示的是 `friendlyFileName`，但预览弹窗点「下载」时常落到存储侧文件名（URL/GUID）。跨域时浏览器还会忽略 `<a download>` 指定名。

## 核心逻辑变更

1. `openAttachmentViewer` 取名改为优先 `friendlyFileName`，再回退 `fileName` / URL 末段。
2. 预览弹窗下载改为先 `fetch` blob，再 `downloadFileFromBlob` 按友好名保存；失败再回退直链并提示。

## 避坑指南

- 跨域直链下载无法强制自定义文件名，必须走同源代理或 blob。
- 业务侧打开查看器时请带上 `friendlyFileName`，不要只传存储 `fileName`。
