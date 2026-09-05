# 附件查看器全屏与新窗口预览

## 背景意图

「新窗口打开」原先直接 `window.open` 文件地址。浏览器对 `.xls` 等 Office 会当下载，和已有的「下载」按钮重复，也无法预览。同时弹窗固定 72% 宽、64vh 高，看表不方便，需要能全屏。

## 核心逻辑变更

1. **新窗口打开**改为进入独立页 `/attachment-preview`（无侧栏 Layout），用同一套 vue-office / 图片 / PDF 预览，不再打开原始文件 URL。
2. 弹窗工具栏增加 **全屏 / 退出全屏**，铺满视口；关闭弹窗时复位。
3. **下载**改为带 `download` 的 `<a>`，指向后端原文件，与预览分离。

## 避坑指南

- **不要对新窗口再 `window.open(xlsUrl)`**：Content-Type 是 Excel 时浏览器必下载。
- 独立预览页是核心路由，刷新后仍可打开；`fileUrl` 等参数走 query，由 vue-router 编码。
- 全屏样式写在未加 scoped 的 wrap class 上（`attachment-viewer-modal--expanded`），因为 Modal 挂到 body。
