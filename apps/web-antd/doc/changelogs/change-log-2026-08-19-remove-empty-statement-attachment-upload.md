# 删除空的对账单附件上传组件

## 背景意图

对账单编辑页已改用通用 `FileUploadInput`。旧组件 `attachment-upload.vue` 在「对账单优化」提交中被清空内容，但空文件仍留在 `views` 下。路由 `import.meta.glob('../views/**/*.vue')` 会扫到全部页面组件，Vite 构建因此失败。

## 核心逻辑变更

- 删除 `src/views/fee-management/statement/components/attachment-upload.vue`（空文件，无引用）。
- 对账单新增/编辑附件仍走 `editor.vue` 中的 `FileUploadInput`，业务行为不变。

## 避坑指南

- `views` 下不要留空 `.vue` 文件。即使没有显式 import，`access.ts` 的 glob 也会把它编进产物。
- 废弃组件应整文件删除，不要只清空内容。
