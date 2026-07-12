# 2026-07-12 PDF 弹窗预览隐藏工具栏与左侧分页

## 背景意图

弹窗内用 iframe 预览 PDF 时，Chrome/Edge 自带阅读器会显示顶部工具栏与左侧缩略图/分页栏，干扰业务预览。需要在保留弹窗的前提下，只展示 PDF 正文。

## 核心逻辑变更

1. **`utils/attachment-url.ts`**
   - 新增 `buildPdfEmbedUrl(url)`：去掉原有 hash 后追加 `#toolbar=0&navpanes=0`，专供 iframe 预览。
   - 下载、新窗口打开仍使用原始 URL，不受影响。

2. **接入点（仅 iframe `src`）**
   - `attachment-viewer-modal.vue`：附件全局预览
   - `pdf-preview-modal.vue`：独立 PDF 预览弹窗
   - `print-format-modal.vue`：打印预览（导出下载仍用原始 `previewUrl`）
   - `office-preview.vue`：PDF 分支预览

## 避坑指南

- `#toolbar=0&navpanes=0` 主要对 **Chrome / Edge** 内置 PDF 阅读器生效；Firefox / Safari 行为可能不同。
- 切勿把带 hash 的 embed URL 用于下载链接，否则可能影响下载文件名或导致二次打开异常。
- URL 已带 `#` 时会整段替换为预览参数，避免重复 hash。
