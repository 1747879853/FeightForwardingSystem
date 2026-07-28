---
title: 附件类型
module: 基础资料
author: auto-doc-sync
last_updated: 2026-07-28
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护附件详细类型（如提单、托书、发票等）及其默认在哪些业务模块展示上传入口，供各业务单据保存附件时选择 `AttachmentDtlTypeId` 与 `ClientVisible`。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/attachment-dtl-type` |
| 路由名称 | `BasicDataAttachmentDtlType` |
| 页面组件 | `src/views/system/basic-data/AttachmentDtlTypeAdmin/list.vue` |
| 权限口径 | Admin.AttachmentDtlType / Admin.AttachmentDtlType.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/AttachmentDtlTypeAdmin/`<br/>`src/api/system/attachment-dtl-type-admin.ts`<br/>`src/api/common/lookup.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表查询：** 支持按类型名称关键字分页查询，展示默认展示模块与创建人；「默认展示模块」列将子表 `moduleType` 映射为 `ModuleType` 枚举显示名。
- **新增/编辑：** 弹窗维护类型名称；通过多选配置默认展示模块（对应子表 `AttachmentDefaultModules`）。
- **删除：** 若类型已被任意附件引用，后端禁止删除。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 需具备 `Admin.AttachmentDtlType.Get` 权限。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **类型名称** | 附件详细类型显示名，如提单、托书。 | `AttachmentDtlTypeAdmin/AddAsync`、`EditAsync` | 列表与业务附件返回 `AttachmentDtlTypeSimpleDto.name` | 必填，最长 100 字符。 |
| **默认展示模块** | 新建业务单据时默认展示该类型上传口的模块集合。 | 系统枚举 `ModuleType`（`getEnumItems`，value 如 110001）+ 子表 `moduleType` | 列表经可变 `moduleTypeLabelMapHolder` 映射显示名后再查询；表单下拉仅启用项 | 可选多选；编辑时全量替换子表。 |
| **创建人** | 类型创建者昵称。 | 详情/分页返回 `creatorUserName` | 只读 | 无修改人字段。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：删除引用校验]** 附件类型被任意 `AttachmentItem` 引用时不可删除，需先解除业务附件关联。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-28 | `Fix` | 列表「默认展示模块」显示 ModuleType 枚举中文名（客户/海运出口/付费申请等）。 | formatter 改为读可变 `holder.map`；`autoLoad: false` 且映射就绪后再 query；勿用 CommonLookup（无业务模块码）。 |
| 2026-06-24 | `Fix` | 默认展示模块下拉与列表显示名改为读取 system/enumeration 中 `ModuleType` 枚举。 | 通过 `getEnumItems('ModuleType')` 统一选项与标签映射，移除 `CommonLookup/GetModuleTypes` 依赖。 |
| 2026-06-23 | `Feature` | 新增附件类型管理页与 API 对接，支持默认展示模块多选维护。 | moduleType 数值与枚举项 `value` 一致；列表模块名通过 `getModuleTypeLabelMap` 缓存映射。 |
