---
title: 付款申请审核
module: 审核审批
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 处理付款申请单的审核任务，支持批量或单条通过、驳回。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/payment-review` |
| 路由名称 | `PaymentReview` |
| 页面组件 | `src/views/audit-approval/payment-review/index.vue` |
| 权限口径 | Admin.PaymentApplication.Audit / Admin.PaymentApplication.Audit.Get |
| 关键源码 | `src/router/routes/modules/audit-approval.ts`<br/>`src/views/audit-approval/data.ts`<br/>`src/views/audit-approval/expense-all/index.vue`<br/>`src/views/audit-approval/expense-all/list.vue`<br/>`src/views/audit-approval/expense-all/modules/detail.vue`<br/>`src/views/audit-approval/payment-review/index.vue`<br/>`src/views/audit-approval/payment-review/data.ts`<br/>`src/api/audit-approval/expense-admin.ts`<br/>`src/api/audit-approval/payment-review-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **付款审核查询：** 按申请单、状态、申请对象等条件查询付款审核任务。
- **审核处理：** 对付款申请进行通过或驳回。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **付款申请单** | 审核对象。 | `payment-review/data.ts` / `payment-review-admin.ts` | **触发/依赖：** 审核结果回写付款申请状态。 | 必须存在有效申请单。 |
| **审核意见** | 通过或驳回说明。 | 审核接口 | **触发/依赖：** 影响工作流记录。 | 驳回时通常应填写原因。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请审核一致性]** 付款审核与付款申请状态强绑定，批量操作需确认选中任务状态一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/audit-approval/payment-review` 对应组件 `src/views/audit-approval/payment-review/index.vue`，权限口径为 Admin.PaymentApplication.Audit / Admin.PaymentApplication.Audit.Get。 |
