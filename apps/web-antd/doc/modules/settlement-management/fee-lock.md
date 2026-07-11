---
title: 费用锁定
module: 财务管理
author: auto-doc-sync
last_updated: 2026-07-11
---

# 1. 业务背景说明 (Background)

**白话解释：** 按运输单维度执行费用锁定或解锁，控制订单费用是否可继续变更。菜单归属「财务管理」分组，与付费结算、银行流水等财务收尾动作并列。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/settlement-management/fee-lock` |
| 路由名称 | `SeaExportFeeLockList` |
| 页面组件 | `src/views/fee-management/fee-lock/fee-lock-list.vue` |
| 权限口径 | Admin.OrderFee.Lock / Admin.OrderFee.Lock.Get |
| 关键源码 | `src/router/routes/modules/settlement-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **锁费查询：** 检索可锁定或已锁定的运输单费用。
- **锁定/解锁：** 对目标运输单执行锁费状态变更。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **运输单** | 锁费作用对象。 | `fee-lock-data.ts` | **触发/依赖：** 影响出口/进口订单费用编辑能力。 | 必须定位到有效运输单。 |
| **锁费状态** | 费用是否被锁定。 | 出口/进口锁费 API | **触发/依赖：** 被订单费用、审核和编辑页读取。 | 状态切换需受权限控制。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：费用锁定一致性]** 锁费会直接影响费用编辑和审核链路，误锁或误解锁会造成账务口径不一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-11 | `Refactor` | 菜单从「费用管理」迁至「财务管理」下；路由 path 由 `/fee-management/fee-lock` 改为 `/settlement-management/fee-lock`，页面组件与权限码不变。 | 路由定义在 `settlement-management.ts` 子项；`order` 位于付费结算、发票开出、银行流水之后。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；原页面 `/fee-management/fee-lock` 对应组件 `fee-lock-list.vue`。 |
