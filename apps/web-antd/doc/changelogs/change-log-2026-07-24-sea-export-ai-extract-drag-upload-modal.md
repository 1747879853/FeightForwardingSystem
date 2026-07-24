---
title: 海运出口 AI 识别改为弹窗拖拽上传
date: 2026-07-24
---

# 背景意图

海运出口新建/编辑页顶栏「AI识别」原先点击后直接唤起系统文件选择框，交互偏隐式、也不支持拖拽。业务希望改为**点击按钮弹出上传区**，用户可将托书等文件拖入后自动开始识别。

# 核心逻辑变更

1. **上传交互**：`form.vue` 点击「AI识别」打开 `ai-extract-upload-modal.vue`（无页脚 Modal + `UploadDragger`）；拖入或点击选文件后立刻触发识别，成功回填后自动关窗；识别中禁用关闭与再次上传。
2. **识别管线**：`use-sea-export-ai-recognize.ts` 将原 `handleAiFileChange(Event)` 改为 `recognizeAiFile(File)`，返回是否成功回填；隐藏 `<input type="file">` 已移除。
3. **文件类型**：仍走 `AI_EXTRACT_ACCEPT` / `isAiExtractSupportedFile` 与 TextIn `ExtractSeaExportToAddDtoAsync`，支持 PDF/图片/Office，行为与改前一致。

# 避坑指南

- 拖入后**立即识别**，不要做成「先选文件再点确定」；失败时弹窗保持打开便于重试。
- 识别中需锁住 `maskClosable`/`closable`/`keyboard`，避免中途关窗丢状态。
- 勿把 `UploadDragger` 的自动上传打开：`beforeUpload` 必须 `return false`，仅把 `File` 交给 `recognizeAiFile`。
- 拖拽区样式依赖 Ant Design 的 `ant-upload-drag-hover` 类做拖入高亮；改样式时用 `:deep` 覆盖 `.ant-upload.ant-upload-drag`，勿回退成默认灰虚线。
