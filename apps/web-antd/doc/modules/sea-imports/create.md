---
title: 海运进口新建
module: 海运进口
author: auto-doc-sync
last_updated: 2026-05-17
---

# 1. 业务背景说明 (Background)

**白话解释：** 创建新的海运进口委托单，提交成功后进入编辑工作台继续维护费用和子业务。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports/create` |
| 路由名称 | `SeaImportCreate` |
| 页面组件 | `src/views/sea-import-admin/form.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/sea-import.ts`<br/>`src/views/sea-import-admin/list.vue`<br/>`src/views/sea-import-admin/form.vue`<br/>`src/views/sea-import-admin/editor.vue`<br/>`src/views/sea-import-admin/data.ts`<br/>`src/views/sea-import-admin/orderFee/data.ts`<br/>`src/api/sea-import/sea-import-admin.ts`<br/>`src/api/sea-import/order-fee-admin.ts`<br/>`src/api/sea-import/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **基础信息录入：** 填写客户、港口、船名航次、件毛体等委托基础字段。
- **干系人角色约束：** 销售、商务、操作、客服、单证为固定角色，不允许删除和重复添加；销售与操作必须选择具体人员后才能保存。
- **提交创建：** 调用新增接口创建主记录与运输单上下文。
- **进入编辑态：** 创建成功后跳转到编辑页，继续处理费用、更改单等业务。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **客户与订舱信息** | 委托单创建的业务主体字段。 | `src/views/sea-import-admin/data.ts` | **触发/依赖：** 客户选择会联动账期与后续费用对象。 | 必填和格式以后端校验为准。 |
| **港口/航线/船公司** | 海运业务执行字段。 | 基础资料与业务下拉组件 | **触发/依赖：** 影响运价、派车、单证等后续操作。 | 需选择有效基础资料。 |
| **干系人（订单人员）** | 运输单协同角色分工。 | `transportOrder.orderUsers` / `UserAttribute` 枚举 | **触发/依赖：** 固定展示销售、商务、操作、客服、单证；角色不可重复，新增仅允许补齐缺失角色。 | 销售必须且仅一人；销售与操作均需选择人员。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口新建一致性]** 新建页只负责建立业务主记录，不应承载编辑态才可进行的费用审核、锁费和结算动作。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；提交前新增“销售与操作必须选择人员”校验。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports/create` 对应组件 `src/views/sea-import-admin/form.vue`，权限口径为 未在路由中声明独立权限。 |
