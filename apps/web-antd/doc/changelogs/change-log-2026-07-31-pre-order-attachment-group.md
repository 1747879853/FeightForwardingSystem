# 业务联系单编辑页接入附件分组

## 背景意图

业务联系单需支持按附件类型上传与保存附件，对接后端两步流程：先通用上传拿 `attachmentId`，再在新增/编辑时随 `attachmentGroup` 全量提交。

## 核心逻辑变更

- 新增 `modules/attachment-groups.vue`：按 `ModuleTypeId=160050`（`PRE_ORDER_MODULE_TYPE_ID`）拉取附件类型，本地维护分组文件列表；上传走 `/upload/UploadFile`。
- `editor.vue` 费用区下方增加「附件」卡片；`canSave` 为 false 时只读（不可上传/删除）。
- `buildSubmitPayload` 始终带上 `attachmentGroup`（编辑全量覆盖，可空数组清空）；详情/复制回填保留 `url`/`friendlyFileName` 供展示。
- API：补 `PRE_ORDER_MODULE_TYPE_ID`、`AttachmentItemInputDto`（含展示用 url/文件名）。

## 避坑指南

1. **两步走，勿漏提交**：上传成功只写本地；必须点「保存」才会经 `AddAsync`/`EditAsync` 绑定。
2. **编辑是全量覆盖**：后端先删旧关联再按入参重建；保存时务必传当前完整 `attachmentGroup`，空数组表示清空。
3. **`attachmentId` 禁止 `Number()` 丢精度**：雪花 ID 原样透传；仅在 `<=0` 过滤时用 `Number` 做有效性判断。
4. **附件类型依赖模块配置**：若「暂无附件类型」，需在基础资料「附件类型」为模块 `160050` 配置默认展示类型。
