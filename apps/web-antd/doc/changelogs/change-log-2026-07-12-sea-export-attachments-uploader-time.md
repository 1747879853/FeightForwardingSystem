---
title: 海运出口附件 Tab 展示上传人与上传时间
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-12
---

# 海运出口附件 Tab 展示上传人与上传时间

## 背景意图

海运出口编辑页（`/sea-exports/:id/edit`）附件 Tab 需要明确展示附件的上传人和上传时间，并在预览附件时保留这些来源信息。文件卡片的大小、上传人、上传时间统一压缩到一行，减少列表纵向占用。

## 核心逻辑变更

改动集中在 `apps/web-antd/src/views/sea-export-admin/attachments/index.vue`：

1. **引入时间格式化工具**：`import { formatDateTime } from '@vben/utils';`（等价于 `YYYY-MM-DD HH:mm:ss`，与项目其它页面口径一致）。
2. **文件项副标题结构调整**：
   - 文件大小、`上传人：{creatorUserName}`、`上传时间：{formatDateTime(creationTime)}` 使用间隔点在同一行展示。
   - 上传人和上传时间均做空值保护；空间不足时单行裁切，并通过 `title` 提供完整信息。
3. **预览弹窗补充来源信息**：打开附件预览时，把当前附件的 `creatorUserName` 和格式化后的 `creationTime` 传入全局 `AttachmentViewerModal`，在预览工具栏左侧展示。
4. **DTO 字段对齐接口**：`AttachmentItemDto` 的上传人字段由旧的 `creatorUserNickName` 调整为接口实际返回的 `creatorUserName`。
5. **卡片列表固定容量**：每个附件类型卡片的文件列表固定为 3 个文件项高度，并保留一个行间距作为底部余量；文件项使用 `flex: 0 0 54px` 禁止被 Flex 压缩，超过 3 个后在卡片内部纵向滚动，避免第 3 个文件被裁切或第 4 个文件被挤入可视区域。

数据来源为 `SeaExportAdminApi.AttachmentItemDto.creatorUserName` 与 `creationTime`，由接口 `GetAttachmentsAsync` 返回，无需额外请求。

## 避坑指南

1. **字段依赖后端返回**：若页面上传人/上传时间显示为空，应确认后端 `GetAttachmentsAsync` 是否实际返回 `creatorUserName` / `creationTime`，前端已做空值隐藏而非报错。
2. **时间格式化统一走 `@vben/utils`**：请勿在该组件内另引 dayjs 手写格式化，保持与全局一致（含时区处理）。
3. **预览组件保持通用**：上传人、上传时间均为可选 props，其他未传元数据的调用方不受影响。
