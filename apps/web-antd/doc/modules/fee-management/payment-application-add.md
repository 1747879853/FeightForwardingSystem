---
title: 付款申请新增
module: 费用管理
author: auto-doc-sync
last_updated: 2026-06-20
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

- **费用选择：** 从可申请费用中勾选生成付款申请；**新建时**进入页面后自动弹出添加费用抽屉（编辑模式不自动弹出）。抽屉内搜索区为五列布局，业务日期占两列，查询/重置按钮在币别条件同一行右侧；条件变更仍自动搜索。列表查询 `GetOrderFeeGroupAsync` **不传**当前申请单 `Id`，已选费用由前端 `selectedFeeIds` 禁选。
- **金额汇总：** 根据费用明细计算申请金额。
- **提交保存：** 保存后形成付款申请单，后续进入审核流程。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入新建路由 | 添加费用抽屉打开 | 自动弹出，引导用户先选费用；编辑路由不触发。 |
| 页面初始 | 用户进入编辑路由 | 页面可用 | 加载已有申请详情，不自动打开抽屉。 |

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
| 2026-06-20 | `Fix` | 已添加费用禁选时「本次结算」不再默认未结金额，展示申请单已有金额。 | `resolveAppliedAmount` + `selectedAppliedAmounts`；全选/单选跳过禁选费用写默认值。 |
| 2026-06-20 | `Fix` | 添加费用抽屉查询 `GetOrderFeeGroupAsync` 不再传申请单 `Id`；已选费用仍由 `selectedFeeIds` 前端禁选。 | 移除 `AddFeeDrawerProps.paymentApplicationId` 及 `fetchData` 中 `Id` 参数。 |
| 2026-06-20 | `Feature` | 添加费用抽屉按「业务+结算对象」分组展示；外层显示结算对象全称，分页 total 为分组数。 | 与 `GetOrderFeeGroupAsync` 新 DTO 对齐；`row-key` 使用 `${transportOrderId}_${settlementId}`。 |
| 2026-06-16 | `feat` | 申请页去除与 Page 重复 padding；添加费用抽屉搜索区五列布局、业务日期占两列、查询重置紧跟币别右对齐。 | 搜索按钮通过 Vben `FormActions` + `col-start-4 col-span-2` 嵌入网格，避免破坏第二行对齐。 |
| 2026-06-16 | `feat` | 新建付费申请（`/add`）挂载后自动打开添加费用抽屉；编辑页行为不变。 | 实现方式与 `payment-settlement/form.vue` 新建自动开抽屉一致：`onMounted` + `nextTick` + `handleOpenAddFee`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application/add` 对应组件 `src/views/fee-management/payment-application/form.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
