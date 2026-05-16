---
title: 费用审核详情
module: 审核审批
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 展示单个费用审核任务的详细信息和对应费用实体。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/expense-review/:id/expense-detail/:entityId` |
| 路由名称 | `ExpenseDetail` |
| 页面组件 | `src/views/audit-approval/expense-all/modules/detail.vue` |
| 权限口径 | Admin.OrderFee.Audit / Admin.OrderFee.Audit.Get |
| 关键源码 | `src/router/routes/modules/audit-approval.ts`<br/>`src/views/audit-approval/data.ts`<br/>`src/views/audit-approval/expense-all/index.vue`<br/>`src/views/audit-approval/expense-all/list.vue`<br/>`src/views/audit-approval/expense-all/modules/detail.vue`<br/>`src/views/audit-approval/payment-review/index.vue`<br/>`src/views/audit-approval/payment-review/data.ts`<br/>`src/api/audit-approval/expense-admin.ts`<br/>`src/api/audit-approval/payment-review-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **任务详情：** 按任务 ID 和实体 ID 加载费用审核详情。
- **变更对比：** 展示费用提交内容，供审核人判断。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **任务 ID** | 工作流任务主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载审核任务。 | 必须有效。 |
| **费用实体 ID** | 被审核费用实体。 | 路由动态段 `:entityId` | **触发/依赖：** 用于定位费用明细。 | 必须与任务关联。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：费用审核详情一致性]** 详情页必须同时保持任务 ID 与费用实体 ID 一致，避免审核错单。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/audit-approval/expense-review/:id/expense-detail/:entityId` 对应组件 `src/views/audit-approval/expense-all/modules/detail.vue`，权限口径为 Admin.OrderFee.Audit / Admin.OrderFee.Audit.Get。 |
