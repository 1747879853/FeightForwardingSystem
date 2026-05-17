---
title: 箱型代码
module: 基础资料
author: auto-doc-sync
last_updated: 2026-05-17
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护箱型箱量代码，支撑运价和委托箱型信息。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/ctn-code` |
| 路由名称 | `BasicDataCtnCode` |
| 页面组件 | `src/views/system/basic-data/CtnCodeAdmin/list.vue` |
| 权限口径 | 未声明独立 authority |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/CtnCodeAdmin/list.vue`<br/>`src/views/system/basic-data/CtnCodeAdmin/data.ts`<br/>`src/views/system/basic-data/CtnCodeAdmin/modules/form.vue`<br/>`src/api/system/base-data/ctn-code-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `箱型代码` 页面查询、创建、编辑和删除基础资料。
- **弹窗表单：** 多数基础资料通过 `CtnCodeAdmin/modules/form.vue` 维护明细。
- **业务复用：** 基础资料作为业务下拉、字典或校验来源被其他模块引用。
- **下拉搜索稳定性：** 依赖 `CtnSelect`（`usePagedSelect`）的搜索已增加过期回包丢弃，避免关键词切换后混入历史分页结果。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **编码** | 基础资料唯一或半唯一识别字段。 | `src/views/system/basic-data/CtnCodeAdmin/data.ts` | **触发/依赖：** 被业务单据或下拉组件引用。 | 唯一性和格式以后端为准。 |
| **名称** | 给业务用户识别的显示值。 | `src/views/system/basic-data/CtnCodeAdmin/data.ts` | **触发/依赖：** 列表、表单、下拉组件共同展示。 | 通常不能为空。 |
| **启用状态** | 控制资料是否可被业务选择。 | `src/api/system/base-data/*.ts` | **触发/依赖：** 禁用后不应继续作为新业务选择项。 | 历史单据展示需兼容旧值。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：箱型代码一致性]** 基础资料页面同质性高，但字段变更会影响大量业务下拉，需谨慎维护编码和启用状态。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-17 | `Fix` | `CtnSelect` 搜索切词时新增请求版本校验，旧关键词晚回包会被丢弃，避免下拉混入历史数据。 | 该修复在 `usePagedSelect` 公共层实现，所有复用该 Hook 的分页选择器同步生效。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/basic-data/ctn-code` 对应组件 `src/views/system/basic-data/CtnCodeAdmin/list.vue`，权限口径为 未声明独立 authority。 |
