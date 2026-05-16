---
title: 费用审核
module: 审核审批
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 集中处理订单费用新增、修改、删除等提交任务的审核。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/expense-review` |
| 路由名称 | `ExpenseAll` |
| 页面组件 | `src/views/audit-approval/expense-all/index.vue` |
| 权限口径 | Admin.OrderFee.Audit / Admin.OrderFee.Audit.Get |
| 关键源码 | `src/router/routes/modules/audit-approval.ts`<br/>`src/views/audit-approval/data.ts`<br/>`src/views/audit-approval/expense-all/index.vue`<br/>`src/views/audit-approval/expense-all/list.vue`<br/>`src/views/audit-approval/expense-all/modules/detail.vue`<br/>`src/views/audit-approval/payment-review/index.vue`<br/>`src/views/audit-approval/payment-review/data.ts`<br/>`src/api/audit-approval/expense-admin.ts`<br/>`src/api/audit-approval/payment-review-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **审核任务查询：** 按任务状态、任务类型、业务单据等筛选费用审核任务。
- **审核处理：** 进入详情查看费用变更并通过或驳回。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **任务状态** | 费用审核任务所处阶段。 | `audit-approval/data.ts` | **触发/依赖：** 影响列表筛选和操作按钮。 | 状态流转以后端工作流为准。 |
| **任务类型** | 新增、修改、删除等费用动作。 | `getTaskTypeOptions` | **触发/依赖：** 决定详情页展示和审核含义。 | 需与费用提交 DTO 对齐。 |
| **费用明细** | 审核的业务对象。 | `expense-admin.ts` | **触发/依赖：** 通过后影响订单费用正式状态。 | 金额、币种、费目必须可追溯。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：费用审核一致性]** 费用审核会改变订单费用状态，驳回与通过都要保持任务、费用行和原始单据一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/audit-approval/expense-review` 对应组件 `src/views/audit-approval/expense-all/index.vue`，权限口径为 Admin.OrderFee.Audit / Admin.OrderFee.Audit.Get。 |
