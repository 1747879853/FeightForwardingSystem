---
title: 通用附件查看器是否支持 OFD 在线预览
module: 共享能力
author: auto-doc-sync
last_updated: 2026-09-09
---

# 解析目标

确认 `.ofd` 能否走全站通用附件查看器 `openAttachmentViewer` 做在线预览。

# 核心逻辑梳理

查看器类型分流在 `attachment-viewer-modal.vue` 的 `category`：

| 扩展名 | `category` | 弹窗表现 |
| :-- | :-- | :-- |
| 图片若干 | `image` | `<Image>` 内嵌 |
| `pdf` | `pdf` | iframe + `#toolbar=0` |
| `xlsx/xls/csv/docx/pptx` | `office` | vue-office 本地渲染 |
| `doc/ppt` | `office` 但 `officeKind` 为空 | 提示旧版不支持，给下载 |
| **`ofd` 及其它** | **`other`** | **提示不支持在线预览，给下载** |

`ofd` 不在 `IMAGE_EXTENSIONS`、`OFFICE_EXTENSIONS` 里，也不等于 `pdf`。点附件仍会打开同一弹窗（有 URL 即可），但正文走 `unsupported` 空态：「该文件类型暂不支持在线预览，请下载后查看」。下载仍走 `downloadAttachmentWithFriendlyName`。

仓库没有 OFD 渲染库（无 ofd.js / `@js-preview/ofd` 等）。浏览器也不能像 PDF 那样原生打开 OFD。

业务侧 OFD 的现有用途：

- AI 识别上传（海出/海进/空出/业务联系单）接受 `.ofd`，是给 TextIn OCR，不是预览。
- 诺诺数电发票把 OFD 当法定原始凭证，文档约定入账/归档下 OFD 或 XML，查看/打印走 PDF。

# 文档偏差 / 架构洞察

- 活文档写「其它类型提示下载」，未点名 OFD。数电发票场景容易误以为 OFD 能像 PDF 一样预览。
- 要在线预览 OFD，必须另接渲染器，不能指望现有 PDF iframe 或 vue-office。
