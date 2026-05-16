---
title: 付款申请新增
module: 费用管理
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 创建付款申请单，选择可申请的应付费用并形成待审核付款申请。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/payment-application/add` |
| 路由名称 | `PaymentApplicationAdd` |
| 页面组件 | `src/views/fee-management/payment-application/form.vue` |
| 权限口径 | Admin.PaymentApplication / Admin.PaymentApplication.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **费用选择：** 从可申请费用中勾选生成付款申请。
- **金额汇总：** 根据费用明细计算申请金额。
- **提交保存：** 保存后形成付款申请单，后续进入审核流程。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **费用明细** | 付款申请的数据来源。 | `payment-application/form-data.ts` | **触发/依赖：** 决定申请金额和供应商/客户口径。 | 需过滤不可申请或已申请费用。 |
| **申请主体** | 付款对象与业务归属。 | `payment-application-admin.ts` | **触发/依赖：** 影响审核和后续结算。 | 不能为空。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请新增一致性]** 新增申请最重要的是避免重复选择费用和金额口径错误。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application/add` 对应组件 `src/views/fee-management/payment-application/form.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
