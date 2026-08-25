---
title: 客户编辑
module: 客户管理
author: auto-doc-sync
last_updated: 2026-08-25
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护单个客户的完整资料，聚合基础信息、联系人、付款条件、发票与附件等子页面。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/clients/:id/edit` |
| 路由名称 | `ClientEdit` |
| 页面组件 | `src/views/client/editor.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/client.ts`<br/>`src/views/client/list.vue`<br/>`src/views/client/base/form.vue`<br/>`src/views/client/editor.vue`<br/>`src/views/client/except-service/index.vue`<br/>`src/views/client/base/data.ts`<br/>`src/views/client/contact/data.ts`<br/>`src/views/client/payment-terms/data.ts`<br/>`src/views/client/invoice/data.ts`<br/>`src/api/sea-export/client-admin.ts`<br/>`src/api/sea-export/client-contact-admin.ts`<br/>`src/api/sea-export/client-except-service-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **基础信息维护：** 编辑客户主数据。未保存切走可 KeepAlive；点 X 关闭才丢。脏检查含基础信息、联系人 Handsontable、开票表单。
- **子资料维护：** 在编辑容器内维护联系人、付款条件、发票和附件；内部 Tab 使用 KeepAlive，页内切换不销毁未保存块。
- **海运出口服务项目：** 仅委托单位（`industryCategories` 含 `p`）可配置按起运港排除的服务项；开关关闭表示排除，保存后写入 `ClientExceptService`；全局模板含默认港口配置（`polId` 为空）时，Tab 以「默认港口配置」Card 展示。
- **业务引用：** 客户资料会被海运委托、费用、对账等业务模块引用。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **客户 ID** | 编辑上下文的主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载客户及其子资料。 | 必须是有效 GUID。 |
| **联系人** | 客户沟通对象。 | `src/views/client/contact/data.ts` / `client-contact-admin.ts` | **触发/依赖：** 依赖当前客户 ID。 | 删除和编辑需保持父客户上下文。 |
| **付款条件** | 客户账期与结算约定。 | `src/views/client/payment-terms/data.ts` / `billing-period-admin.ts` | **触发/依赖：** 影响费用、付款和结算口径。 | 删除时 `row.id` 可能为大数 string，须原样透传，禁止 `Number()`。 |
| **排除服务项** | 委托单位在各起运港（含默认港口配置）禁用的海运出口服务项。 | `ClientExceptServiceAdmin` | **触发/依赖：** 依赖客户为委托单位；展示数据来自全局 `SeServiceConfig` 与 `ClientExceptService` 合并计算 `isChecked`；`polId` 为空的分组表示默认模板。 | 非委托单位不可查看/修改；保存默认分组排除项时 `polId` 传 `null`。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：客户编辑一致性]** 客户子资料依赖父级客户 ID，刷新或切换 Tab 时要避免丢失编辑上下文。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-25 | `Feature` | 供应商行业类别新增「码头」（字母 `t`，数字 `20`）。 | 与后端 `IndustryCategory.码头` 对齐。详见 `changelogs/change-log-2026-08-25-sea-import-tapd-1000779.md`。 |
| 2026-07-12 | `Fix` | 客户账期删除不再对 `row.id` 使用 `Number()`，避免大数主键删错记录。 | `BillingPeriodAdminApi.IdDto.id` 改为 `number \| string`，与 json-bigint 响应一致。 |
| 2026-06-09 | `Feature` | 客户「海运出口服务项目」Tab 支持展示默认港口配置分组，保存排除项时 `polId` 传 `null`。 | `formatPolLabel` / `buildEditPayload` / `getPortGroupKey` 统一空 `polId` 口径，文案复用基础资料 `defaultPolConfig`。 |
| 2026-05-30 | `Refactor` | “海运出口服务项目”Tab 的服务项枚举加载统一改为 `ServiceType` 大写口径，并复用海运出口共享模块。 | `except-service/index.vue` 改为调用统一 `loadSeServiceTypeOptions()`，移除 `serviceType` 小写回退，确保客户页与海运出口主流程枚举源一致。 |
| 2026-05-24 | `Feature` | 新增「海运出口服务项目」Tab，对接委托单位按港口排除服务项。 | API：`GetClientExceptServicesAsync` / `EditClientExceptServicesAsync`；保存仅提交 `isChecked=false` 的 `serviceTypes`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/clients/:id/edit` 对应组件 `src/views/client/editor.vue`，权限口径为 未在路由中声明独立权限。 |
