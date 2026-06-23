---
title: 附件类型管理前端实现
module: 基础资料
author: auto-doc-sync
last_updated: 2026-06-23
---

# 1. 背景意图 (Background)

对接后端 `AttachmentDtlTypeAdmin` 与 `AttachmentDtlType` 接口，在基础资料模块新增「附件类型」管理页，支持维护附件详细类型名称及其默认展示模块（子表 `AttachmentDefaultModule`）。

# 2. 核心逻辑变更 (Core Changes)

## 2.1 API

| 文件 | 说明 |
| :-- | :-- |
| `src/api/system/attachment-dtl-type-admin.ts` | 管理端增删改查分页 |
| `src/api/system/attachment-dtl-type.ts` | 通用列表与按模块查询（供业务页后续接入） |
| `src/api/common/lookup.ts` | `GetModuleTypes` 及 moduleType 显示名映射 |

## 2.2 页面

- 路由：`/basic-data/attachment-dtl-type`
- 权限：`Admin.AttachmentDtlType`（含 `.Get/.Add/.Edit/.Delete`）
- 列表：类型名称、默认展示模块、创建人、创建时间
- 表单：类型名称 + 默认展示模块多选（编辑时子表全量替换）

## 2.3 模块类型来源

默认展示模块选项来自 `CommonLookup/GetModuleTypes`，`moduleType` 数值与 `ModuleType.id` 一致（如付费结算 `160011`）。

# 3. 避坑指南 (Pitfalls)

- 删除附件类型时若已被 `AttachmentItem` 引用，后端会拒绝并提示引用信息。
- `AttachmentDtlType` 仅返回创建人昵称，无修改人字段。
- 编辑时 `attachmentDefaultModules` 为全量替换，前端需提交完整多选结果。

# 4. 变更日志 (Changelog)

| 日期       | 变更类型  | 业务功能变动                                    |
| :--------- | :-------- | :---------------------------------------------- |
| 2026-06-23 | `Feature` | 新增附件类型管理页、API 封装与基础资料路由/i18n |
