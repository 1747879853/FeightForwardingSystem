---
title: 费用审核详情
module: 审核审批
author: auto-doc-sync
last_updated: 2026-07-12
---

# 1. 业务背景说明 (Background)

**白话解释：** 展示单个费用审核任务的详细信息和对应费用实体；既可嵌在费用审核列表页内，也可由工作台等入口深链到独立路由页打开。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/expense-review/:id/expense-detail/:entityId` |
| 路由名称 | `ExpenseDetail` |
| 页面组件 | `src/views/audit-approval/expense-all/modules/detail.vue` |
| 权限口径 | Admin.OrderFee.Audit / Admin.OrderFee.Audit.Get |
| 关键源码 | `src/router/routes/modules/audit-approval.ts`<br/>`src/views/audit-approval/data.ts`<br/>`src/views/audit-approval/expense-all/index.vue`<br/>`src/views/audit-approval/expense-all/list.vue`<br/>`src/views/audit-approval/expense-all/modules/detail.vue`<br/>`src/views/audit-approval/payment-review/index.vue`<br/>`src/views/audit-approval/payment-review/data.ts`<br/>`src/api/audit-approval/expense-admin.ts`<br/>`src/api/audit-approval/payment-review-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **双模式：** 列表页内嵌时由父组件传入 `transportOrderId`/`entityId`；独立路由打开时由路由 `props` 映射 `:id`/`:entityId`，组件内再兜底读 `route.params`。
- **独立页工具条：** 独立打开时展示返回与上下/左右布局切换。
- **任务详情：** 按运输单 ID 与实体 ID 加载应收/应付费用表并审核。
- **变更对比：** 展示费用提交内容，供审核人判断。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **transportOrderId** | 运输单 ID（路由段 `:id`）。 | 路由 `props` / `route.params.id` / 父组件 props | **触发/依赖：** 传给应收/应付费用表加载明细。 | 必须有效。 |
| **entityId** | 关联业务实体 ID（路由段 `:entityId`，业务上多为 `TransportOrder.Id`）。 | 路由 `props` / `route.params.entityId` / 父组件 props | **触发/依赖：** 与 `transportOrderId` 一起定位费用明细。 | 必须与任务关联；两段 GUID 可相同。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：费用审核详情一致性]** 详情页必须同时保持运输单 ID 与实体 ID 可用；独立路由必须配置 `props` 映射，否则内嵌可用、深链空白。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-12 | `Fix` | 独立详情路由增加 props 映射；组件支持路由兜底与独立页工具条，工作台深链可打开费用详情。 | 见 `change-log-2026-07-12-workspace-review-filter-and-expense-detail.md`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/audit-approval/expense-review/:id/expense-detail/:entityId` 对应组件 `src/views/audit-approval/expense-all/modules/detail.vue`，权限口径为 Admin.OrderFee.Audit / Admin.OrderFee.Audit.Get。 |
