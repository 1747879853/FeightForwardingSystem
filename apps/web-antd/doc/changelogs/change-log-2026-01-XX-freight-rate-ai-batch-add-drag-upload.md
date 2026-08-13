---
title: 运价AI批量新增改为拖拽上传方式
date: 2026-01-XX
module: 运价管理
author: AI Assistant
---

# 背景意图

运价管理的「AI批量新增」功能原先点击按钮后直接唤起系统文件选择框，交互方式较为传统，不支持拖拽上传。为提升用户体验，参考海运出口AI识别功能的实现，将其改为**点击按钮弹出拖拽上传区**，用户可将运价报价文件拖入或点击选择后自动开始识别。

# 核心逻辑变更

1. **新增上传弹窗组件**：创建 `freight-rate-ai-upload-modal.vue`，使用 Ant Design Vue 的 `UploadDragger` 实现拖拽上传功能
   - 支持 PDF、图片（jpg/jpeg/png/webp/heic/heif/gif/bmp）、Office文档（doc/docx/xls/xlsx/rtf/txt）
   - 识别中禁用关闭按钮、遮罩关闭和键盘关闭，避免中途关窗丢失状态
   - 拖入高亮效果通过 `:deep(.ant-upload-drag-hover)` 实现

2. **修改列表页交互**：在 `list.vue` 中集成上传弹窗
   - 添加 `aiExtractModalOpen` 和 `aiRecognizing` 响应式变量
   - 修改 `onAIBatchAdd` 函数：点击时打开上传弹窗而非直接触发文件选择
   - 新增 `handleAiExtractFile` 函数：接收文件后调用 Gemini AI 识别接口，识别成功后关闭弹窗并打开批量新增模态框

3. **保持识别管线不变**：仍使用 `extractSeFreiPriceByGemini` 接口，支持的文件类型和数据转换逻辑与改前一致

# 避坑指南

- **beforeUpload 必须 return false**：阻止 UploadDragger 的自动上传行为，仅将 File 对象交给父组件的识别函数处理
- **识别中锁定弹窗关闭**：需同时设置 `maskClosable`、`closable`、`keyboard` 为 `!recognizing`，避免用户在识别过程中关闭弹窗
- **拖拽区样式定制**：使用 `:deep(.ant-upload.ant-upload-drag)` 覆盖默认样式，不要回退成灰虚线样式
- **文件类型一致性**：前端白名单需与后端 TextIn/Gemini 支持的文件类型保持一致，目前支持 PDF、图片、Office 文档

# 影响范围

- 新增文件：`apps/web-antd/src/views/sea-export-admin/freight-rate/modules/freight-rate-ai-upload-modal.vue`
- 修改文件：`apps/web-antd/src/views/sea-export-admin/freight-rate/list.vue`

# 测试要点

1. 点击「AI批量新增」按钮应弹出拖拽上传区
2. 拖入支持的格式文件应自动开始识别，显示 loading 状态
3. 识别中无法关闭弹窗（点击遮罩、ESC、关闭按钮均无效）
4. 识别成功后自动关闭上传弹窗，打开批量新增模态框并回填数据
5. 识别失败时弹窗保持打开，允许用户重试
6. 拖入不支持的格式应提示文件格式错误
