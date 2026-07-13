# 海运出口编辑页附件 Tab

## 1. 背景意图 (Background)

海运出口后端已提供独立附件接口（按 `AttachmentDtlTypeId` 分组查询、扁平增删），且基础资料中已支持附件类型及默认展示模块配置。编辑工作台此前未对接附件能力，业务无法在单证维护后上传提单、托书等分类附件。

## 2. 核心逻辑变更 (Core Changes)

### 2.1 API 层

- `sea-export-admin.ts` 新增 DTO：`AttachmentGroupDto`、`AttachmentItemDto`、`SeaExportAttachmentsAddDto`、`SeaExportAttachmentsDeleteDto` 等。
- 新增接口封装：
  - `getSeaExportAttachments` → `GetAttachmentsAsync`
  - `addSeaExportAttachments` → `AddAttachmentsAsync`
  - `deleteSeaExportAttachments` → `DeleteAttachmentsAsync`

### 2.2 附件 Tab 组件

- 新建 `src/views/sea-export-admin/attachments/index.vue`（组件名 `SeaExportAttachments`）。
- 进入 Tab 时并行请求：
  - `GetListByModuleTypesAsync`（`moduleType` 由 `ModuleType` 枚举中「海运出口」解析）
  - `GetAttachmentsAsync`（按类型分组）
- UI：按附件详细类型分组 Card；展示所有已配置类型（含空槽位）；每类型支持多文件。
- 上传：文件上传成功后即时调用 `AddAttachmentsAsync`；默认 `clientVisible=true`，可按类型勾选切换。
- 删除：确认后即时调用 `DeleteAttachmentsAsync`（传 `attachmentIds`）。
- 权限：沿用 `Admin.SeaExport.Edit`；无 Edit 权限时 Tab 只读。

### 2.3 编辑工作台集成

- `editor.vue` 在「单证信息」与「派车」之间新增「附件」Tab。

### 2.4 辅助

- `lookup.ts` 新增 `resolveModuleTypeByLabel`，按枚举显示名解析 `moduleType` 数值。
- `attachment-dtl-type.ts` 的 `AttachmentDtlTypeSimpleDto` 补充 `sortId` 字段。

## 3. 避坑指南 (Pitfalls)

- **仅编辑页**：新建路由 `/sea-exports/create` 无 Tab 壳，附件需保存主单后在编辑页维护（后端 Add 接口依赖海出 UUID）。
- **moduleType 解析**：使用 `system.permission.moduleSeaExport` 文案匹配枚举，勿硬编码数值。
- **删除参数**：`DeleteAttachmentsAsync` 的 `attachmentIds` 为 `Attachment.Id`（即 `attachmentId` 字段），非 `AttachmentItem.id`。
- **无 Edit 接口**：上传后不可单独修改 `clientVisible`，仅能在上传时设定。
