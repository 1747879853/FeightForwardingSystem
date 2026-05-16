---
title: 付款申请编辑
module: 费用管理
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑已有付款申请单，在状态允许时调整明细并提交。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/payment-application/:id/edit` |
| 路由名称 | `PaymentApplicationEdit` |
| 页面组件 | `src/views/fee-management/payment-application/form.vue` |
| 权限口径 | Admin.PaymentApplication / Admin.PaymentApplication.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **加载申请单：** 按申请单 ID 加载主表与费用明细。
- **维护明细：** 在状态允许时增删或调整费用。
- **提交审核：** 进入付款申请审核链路。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **申请单 ID** | 编辑上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载付款申请详情。 | 必须有效。 |
| **审核状态** | 控制是否可编辑。 | `PaymentApplicationStatus` | **触发/依赖：** 与付款审核页面联动。 | 审核中或已完成状态不应随意修改。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请编辑一致性]** 编辑页必须尊重申请状态，不能绕过审核状态直接修改已进入流程的数据。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application/:id/edit` 对应组件 `src/views/fee-management/payment-application/form.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
