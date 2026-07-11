---
title: 付款申请列表
module: 费用管理
author: auto-doc-sync
last_updated: 2026-07-12
---

# 1. 业务背景说明 (Background)

**白话解释：** 付款申请列表用于查询、创建和进入付款申请单编辑，是应付费用付款流程入口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/payment-application` |
| 路由名称 | `PaymentApplicationList` |
| 页面组件 | `src/views/fee-management/payment-application/list.vue` |
| 权限口径 | Admin.PaymentApplication / Admin.PaymentApplication.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **申请单查询：** 按申请状态、客户/供应商、时间等条件查询付款申请。
- **创建申请：** 进入新增页选择可申请付款的费用。
- **编辑申请：** 进入编辑页维护申请单明细。
- **申请合计列：** 列表按当前页数据动态展示各币别「{币别}申请合计」列（收+付原币合计）；列配置面板仅保留「申请合计」锚点项，拖动/显隐锚点即统一控制各币别列。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **申请状态** | 付款申请单当前处理阶段。 | `payment-application/data.ts` / `PaymentApplicationStatus` | **触发/依赖：** 影响编辑、提交和审核入口。 | 状态流转以后端枚举为准。 |
| **申请金额** | 本次申请付款金额汇总。 | `form-data.ts` | **触发/依赖：** 由费用明细汇总而来。 | 不得超过可申请口径。 |

| **{币别}申请合计** | 列表按币别展示的申请合计（原币）。 | `currencyGroup[].payAmount + receiveAmount` | **触发/依赖：** 当前页数据变化时动态生成列。 | 只读展示。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请列表一致性]** 付款申请需保证费用选择、申请金额和审核状态一致，避免重复申请或超额申请。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-12 | `Fix` | 列配置「申请合计」改为锚点代理列，拖动/显隐锚点统一控制各币别申请合计列。 | `APPLIED_TOTAL_ANCHOR_FIELD` + `syncAppliedTotalColumns`；币别列在面板隐藏、跟随锚点顺序与显隐。 |
| 2026-07-12 | `Feature` | 列表按当前页币别动态生成「{币别}申请合计」列。 | `useColumns(rows)` + `watch(tableData)` 重建列；`calcRowAppliedTotal` 汇总 pay+receive。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application` 对应组件 `src/views/fee-management/payment-application/list.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
