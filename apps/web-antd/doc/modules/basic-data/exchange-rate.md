---
title: 汇率资料
module: 财务管理
author: auto-doc-sync
last_updated: 2026-08-20
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护币种汇率，为跨币种费用、付款和结算提供换算基础。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/settlement-management/exchange-rate` |
| 路由名称 | `ExchangeRateList` |
| 页面组件 | `src/views/system/basic-data/ExchangeRateAdmin/list.vue` |
| 权限口径 | Admin.ExchangeRate / Admin.ExchangeRate.Get |
| 关键源码 | `src/router/routes/modules/settlement-management.ts`<br/>`src/views/system/basic-data/ExchangeRateAdmin/list.vue`<br/>`src/views/system/basic-data/ExchangeRateAdmin/data.ts`<br/>`src/views/system/basic-data/ExchangeRateAdmin/modules/form.vue`<br/>`src/api/system/base-data/exchange-rate-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `汇率资料` 页面查询、创建、编辑和删除基础资料。
- **弹窗表单：** 多数基础资料通过 `ExchangeRateAdmin/modules/form.vue` 维护明细。
- **业务复用：** 基础资料作为业务下拉、字典或校验来源被其他模块引用。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **currencyId** | 汇率对应币别主键。 | `CurrencySelect`<br/>`currency-admin` | **列表展示：** 读 `currency?.code`（兜底 `cnName` / 币种缓存），勿读已删除的平铺 `currencyCode`。 | **必填**；大数 ID 为 string 时原样校验与提交。 |
| **编码** | 基础资料唯一或半唯一识别字段。 | `src/views/system/basic-data/ExchangeRateAdmin/data.ts` | **触发/依赖：** 被业务单据或下拉组件引用。 | 唯一性和格式以后端为准。 |
| **名称** | 给业务用户识别的显示值。 | `src/views/system/basic-data/ExchangeRateAdmin/data.ts` | **触发/依赖：** 列表、表单、下拉组件共同展示。 | 通常不能为空。 |
| **启用状态** | 控制资料是否可被业务选择。 | `src/api/system/base-data/*.ts` | **触发/依赖：** 禁用后不应继续作为新业务选择项。 | 历史单据展示需兼容旧值。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：汇率资料一致性]** 基础资料页面同质性高，但字段变更会影响大量业务下拉，需谨慎维护编码和启用状态。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-20 | `Fix` | 无 | 生效判断改为按本地日历日（结束日当天全天有效），避免 `YYYY-MM-DD` 被当成 UTC 0 点后结束日上午过期。付费申请弹窗预填应付 `crValue`。详见 `changelogs/change-log-2026-08-20-payment-application-exchange-rate-modal.md` |
| 2026-08-11 | `Fix` | 列表「币别」列恢复显示编码 | 列 formatter 读 `currency?.code`。详见 `changelogs/change-log-2026-08-11-exchange-rate-currency-simple-dto.md` |
| 2026-07-12 | `Fix` | 修复汇率编辑时切换币别的大数 ID 校验与精度问题。 | `currencyId` 校验改为 string 透传；`ExchangeRateEditDto.id` 等类型放宽为 `number \| string`。 |
| 2026-07-12 | `Refactor` | 汇率管理菜单从「基础资料」迁入「财务管理」，路由改为 `/settlement-management/exchange-rate`；页面组件与 API 不变。 | 父级 `SettlementManagement` 的 `authority` 聚合增加 `Admin.ExchangeRate`；自 `basic-data.ts` 移除对应子路由。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/basic-data/exchange-rate` 对应组件 `src/views/system/basic-data/ExchangeRateAdmin/list.vue`，权限口径为 Admin.ExchangeRate / Admin.ExchangeRate.Get。 |
