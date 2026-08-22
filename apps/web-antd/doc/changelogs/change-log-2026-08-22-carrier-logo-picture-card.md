# 2026-08-22 船公司 Logo 改为单图缩略图预览

## 背景意图

`/basic-data/carrier` 抽屉里 Logo 虽已限制 `maxCount: 1`，但仍走默认 `text` 附件列表：上传后只看到文件名，看不到图片。需要改成类似头像的单图卡片，上传后直接预览内容。

## 核心逻辑变更

- `CarrierAdmin/data.ts`：Logo 的 `FileUploadInput` 增加 `listType: 'picture-card'`，仍为单文件、图片类型、≤5MB。
- `file-upload-input.vue`：`picture-card` 模式下不再渲染下方「已上传文件」文件名列表；缩略图正方形、`object-fit: contain`，并隐藏 Ant Design 列表项文件名。
- 预览：编辑回显时文件名可能没有扩展名（如 `logo`），`picture-card` 或 URL 带图片扩展名时一律弹窗看图，避免误开新窗口。
- 提交协议不变：仍取第一项 `attachmentId`，无值传 `null`。

## 避坑指南

- Logo / 头像类字段必须显式传 `listType: 'picture-card'`；默认 `text` 仍是附件文件名列表。
- `picture-card` 达到 `maxCount` 后加号会消失，换图需先删除再上传。
- 组织管理公司 Logo 共用该组件，会一并去掉文件名列表、改为正方形缩略图。
