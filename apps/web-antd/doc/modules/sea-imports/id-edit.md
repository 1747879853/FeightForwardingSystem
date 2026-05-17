---
title: 海运进口编辑工作台
module: 海运进口
author: auto-doc-sync
last_updated: 2026-05-17
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑页是海运进口的核心业务容器，聚合基础信息、费用、更改单及相关执行子模块。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports/:id/edit` |
| 路由名称 | `SeaImportEdit` |
| 页面组件 | `src/views/sea-import-admin/editor.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/sea-import.ts`<br/>`src/views/sea-import-admin/list.vue`<br/>`src/views/sea-import-admin/form.vue`<br/>`src/views/sea-import-admin/editor.vue`<br/>`src/views/sea-import-admin/data.ts`<br/>`src/views/sea-import-admin/orderFee/data.ts`<br/>`src/api/sea-import/sea-import-admin.ts`<br/>`src/api/sea-import/order-fee-admin.ts`<br/>`src/api/sea-import/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **基础信息维护：** 加载并维护委托主数据与运输单字段。
- **干系人角色约束：** 基础信息表单中的销售、商务、操作、客服、单证角色不可删除、不可重复；销售与操作必须指定人员。
- **费用处理：** 在订单费用子模块维护应收应付、费用状态和提交审核。
- **更改单处理：** 处理业务变更带来的费用或单据信息调整。
- **业务子模块：** 出口侧包含派车、分单等扩展能力；进口侧以费用、更改单和单据信息为主。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托 ID** | 编辑页上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载详情、费用、更改单等子资源。 | 必须是有效 GUID。 |
| **干系人（订单人员）** | 运输单协同角色分工。 | `transportOrder.orderUsers` / `src/views/sea-import-admin/form.vue` | **触发/依赖：** 固定角色行不可删除、角色不可重复，新增仅补齐缺失角色。 | 销售必须且仅一人；销售与操作必须选择人员。 |
| **订单费用** | 应收应付费用行。 | `src/views/sea-import-admin/orderFee/data.ts` / `order-fee-admin.ts` | **触发/依赖：** 提交后进入费用审核，锁费后编辑受限。 | 金额、币种、费目等校验以后端为准。 |
| **更改单** | 业务变更记录。 | `src/views/sea-import-admin/changeOrder/` / `change-order-admin.ts` | **触发/依赖：** 可能触发费用变化或审核链路。 | 需保持与原委托上下文一致。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口编辑工作台一致性]** 编辑工作台跨多个子模块，最关键的卡点是锁费、业务锁定、审核中费用和子模块上下文一致性。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；提交前新增“销售与操作必须选择人员”校验。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports/:id/edit` 对应组件 `src/views/sea-import-admin/editor.vue`，权限口径为 未在路由中声明独立权限。 |
