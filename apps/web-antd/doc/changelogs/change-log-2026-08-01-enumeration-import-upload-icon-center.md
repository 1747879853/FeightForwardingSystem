# 2026-08-01 枚举导入弹窗上传图标居中

## 背景意图

导入配置弹窗里 `UploadDragger` 使用 `IconifyIcon`，未按 Ant Design 原生 `.anticon` 样式居中，图标偏左、文案居中，观感错位。

## 核心逻辑变更

给 `.ant-upload-drag-icon` 增加 `flex justify-center`，图标改为固定 `size-12`，保证水平居中。

## 避坑指南

> [!NOTE] 同类拖拽上传若用 `IconifyIcon` 替代 `InboxOutlined`，需自行加居中，不能依赖 Ant Design 对 `.anticon` 的默认样式。
