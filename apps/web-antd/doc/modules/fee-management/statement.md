---
title: 对账单列表
module: 费用管理
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 对账单列表用于管理客户或供应商对账单，是结算确认的入口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/statement` |
| 路由名称 | `StatementList` |
| 页面组件 | `src/views/fee-management/statement/index.vue` |
| 权限口径 | Admin.Statement / Admin.Statement.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **对账查询：** 按对象、期间、状态查询对账单。
- **新增对账：** 进入对账单新增页选择费用生成对账。
- **编辑对账：** 维护既有对账单。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **对账对象** | 客户或供应商主体。 | `statement/data.ts` | **触发/依赖：** 决定可纳入对账的费用范围。 | 必须与费用主体一致。 |
| **对账期间** | 费用归集时间范围。 | `statement/form-data.ts` | **触发/依赖：** 影响费用筛选。 | 日期范围需合法。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：对账单列表一致性]** 对账单的关键风险是费用范围、对账对象和期间不一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/statement` 对应组件 `src/views/fee-management/statement/index.vue`，权限口径为 Admin.Statement / Admin.Statement.Get。 |
