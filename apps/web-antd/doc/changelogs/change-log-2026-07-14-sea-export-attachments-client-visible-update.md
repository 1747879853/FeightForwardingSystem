# 海运出口附件对接批量修改客户可见接口

- 日期：2026-07-14
- 类型：Feature
- 影响范围：海运出口编辑页「附件」Tab（`apps/web-antd/src/views/sea-export-admin/attachments/index.vue`）、新增通用 Attachment API（`apps/web-antd/src/api/system/attachment.ts`）、i18n。

## 背景意图

此前「附件」Tab 的「客户可见」勾选是**类型级本地状态**，只作用于**下一次上传**的 `clientVisible`，已上传附件无法回改可见性（后端当时无对应编辑接口）。

后端新增批量接口后，前端需要支持对**既有附件**逐条/批量修改「客户是否可见」，并在加载时如实回显每个文件的可见状态。

## 核心逻辑变更

### 1. 新增 Attachment 服务 API

`apps/web-antd/src/api/system/attachment.ts`

- 接口：`PUT /services/app/Attachment/UpdateAttachmentItemsClientVisibleAsync`
  - ⚠️ 需求文档写的是 POST，但后端 OpenAPI 实际定义为 **PUT**，以 OpenAPI 为准。
- 入参：`UpdateAttachmentItemClientVisibleDto[]`，每条 `{ id: number; clientVisible?: boolean }`。
  - `id` 为 **AttachmentItem 关联 Id**（对应 `AttachmentItemDto.id`，int64），**不是** `attachmentId`（后者用于删除）。
  - 后端约定：`id <= 0` 忽略；同一 id 多次传入取最后一条；空集合或全部无效直接返回不报错。
- 出参：无（`requestClient.put<void>`）。

### 2. 附件组件对接（`attachments/index.vue`）

- **单文件切换**：每个文件项新增 `Switch`（`item.clientVisible`），切换即调用接口 `[{ id: item.id, clientVisible }]`，成功后更新本地 `item.clientVisible`，切换期间 `Switch` loading。
- **类型批量**：卡片标题行「客户可见」`Checkbox` 语义升级为「该类型全部可见」：
  - 有附件时选中态/半选态由该类型下各 `item.clientVisible` 计算（全选/部分/全不选，支持 `indeterminate`）。
  - 勾选/取消勾选一次性提交该类型下所有 `id>0` 的附件（一次批量调用）。
  - 同时同步 `clientVisibleByTypeId`（上传默认值），保留「新上传附件跟随该勾选」的原行为。
  - 无附件时仅设置上传默认值，不发请求。
- **回显**：不再仅依赖本地 Map，可见性直接来自 `GetAttachmentsAsync` 返回的 `item.clientVisible`。

### 3. i18n

`zh-CN/en-US` 的 `seaExport.export.attachments` 补充：`clientVisibleTip`、`clientInvisibleTip`、`visibilityUpdateSuccess`、`visibilityUpdateFailed`。

## 避坑指南

- **id ≠ attachmentId**：本接口的 `id` 是 AttachmentItem 关联主键（`AttachmentItemDto.id`），删除接口用的是 `attachmentId`，二者不可混用。
- **方法是 PUT**：不要按需求文档写成 POST。
- **半选态点击**：Ant `Checkbox` 处于 `indeterminate` 时点击会变为选中（全部设为可见），符合预期。
- **本地状态更新**：`groups` 为深层响应式 `ref`，直接改 `item.clientVisible` 即可触发视图更新，无需重新拉取；如需与后端强一致可改为 `await loadAttachments()`。
