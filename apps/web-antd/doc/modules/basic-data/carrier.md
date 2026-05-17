---
title: 船公司资料
module: 基础资料
author: auto-doc-sync
last_updated: 2026-05-17
---

# 1. 业务背景说明 (Background)

**白话解释：** 船公司/承运人基础资料，为委托和运价提供承运主体。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/carrier` |
| 路由名称 | `BasicDataCarrier` |
| 页面组件 | `src/views/system/basic-data/CarrierAdmin/list.vue` |
| 权限口径 | Admin.Carrier / Admin.Carrier.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/CarrierAdmin/list.vue`<br/>`src/views/system/basic-data/CarrierAdmin/data.ts`<br/>`src/views/system/basic-data/CarrierAdmin/modules/form.vue`<br/>`src/api/system/base-data/carrier-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `船公司资料` 页面查询、创建、编辑和删除基础资料。
- **弹窗表单：** 多数基础资料通过 `CarrierAdmin/modules/form.vue` 维护明细。
- **业务复用：** 基础资料作为业务下拉、字典或校验来源被其他模块引用。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **cnName / cnShortName / enName / code** | 船公司中英文名称与代码标识。 | `src/views/system/basic-data/CarrierAdmin/data.ts` | **触发/依赖：** 被运价、委托等下游选择器复用。 | 由表单长度限制与后端必填规则共同约束。 |
| **logo** | 船公司 Logo 附件（单文件）。 | `src/views/system/basic-data/CarrierAdmin/modules/form.vue`<br/>`src/api/system/base-data/carrier-admin.ts` | **触发/依赖：** 上传后取 `attachmentId`，提交为 `logo.attachmentId`。无值时传 `null` 可清空。 | 限制为图片类型、单文件上传。 |
| **remark / otherCode / ediCode** | 业务补充说明与扩展编码信息。 | `src/views/system/basic-data/CarrierAdmin/data.ts` | **触发/依赖：** 用于检索和业务识别补充。 | 文本长度受前端与后端共同限制。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：船公司资料一致性]** 基础资料页面同质性高，但字段变更会影响大量业务下拉，需谨慎维护编码和启用状态。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-17 | `Feature/Fix` | 将 `CarrierAdmin` 所有前端 API 路径统一恢复为 `Async` 后缀（GetPagedList/Detail/Add/Edit/Delete），避免路由不匹配。 | 字段协议（logo、分页参数）与接口命名后缀是独立维度，本次仅修正路由命名，不回退 DTO 对接。 |
| 2026-05-17 | `Feature/Fix` | `/basic-data/carrier` 对接新版 `CarrierAdmin` 协议：移除 `countryId`，新增 `logo` 上传与提交；列表增加 Logo 文件名展示。 | 船公司 API 分页参数按 Swagger 对齐为 `Keyword/.../PageIndex/PageSize`，并同步影响 `carrier-select` 与海运出口运价模块对船公司下拉的分页调用。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/basic-data/carrier` 对应组件 `src/views/system/basic-data/CarrierAdmin/list.vue`，权限口径为 Admin.Carrier / Admin.Carrier.Get。 |
