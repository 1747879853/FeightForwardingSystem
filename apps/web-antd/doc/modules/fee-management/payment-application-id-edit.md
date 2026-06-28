---
title: 付款申请编辑
module: 费用管理
author: auto-doc-sync
last_updated: 2026-06-28
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑已有付款申请单，在状态允许时调整明细并提交。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/payment-application/:id/edit` |
| 路由名称 | `PaymentApplicationEdit` |
| 页面组件 | `src/views/fee-management/payment-application/form.vue` |
| 权限口径 | Admin.PaymentApplication / Admin.PaymentApplication.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **加载申请单：** 按申请单 ID 加载主表与费用明细。
- **维护明细：** 在状态允许时增删或调整费用。
- **提交审核：** 进入付款申请审核链路。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **申请单 ID** | 编辑上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载付款申请详情。 | 必须有效。 |
| **审核状态** | 控制是否可编辑。 | `PaymentApplicationStatus` | **触发/依赖：** 与付款审核页面联动。 | 审核中或已完成状态不应随意修改。 |

| **结算对象** | 付款申请及费用明细的结算客户。 | `settlementId` / `clientName` / `settlementName` | **触发/依赖：** 主表选择后锁定添加费用抽屉筛选；费用内层列展示 `settlementName`。 | 已有费用时不可清空。 |

| **费用分组** | 编辑页与选费抽屉外层列表的分组维度。 | `GetOrderFeeGroupAsync` / 本地 `groupFeesByOrder` | **触发/依赖：** 按「业务 + 结算对象」联合分组；`row-key` 为复合键。 | 同一业务可对应多行（不同结算对象）；底部统计为组数非票数。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请编辑一致性]** 编辑页必须尊重申请状态，不能绕过审核状态直接修改已进入流程的数据。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-28 | `Feature` | 费用合计每个币别新增结算银行下拉（必填、默认选中默认账户、可切换、展示开户行/账号/SWIFT）；编辑保存经 `EditAsync` 全量替换 `paymentApplicationBanks`，详情按 `currencyGroup[].paymentApplicationBank` 回填。 | 与新增页共用 `form.vue`；`restoreBankSelectionsFromDetail` 区分原币（按币别 id）/指定币别（结算币别共享）回填；`saveEditMode` 携带银行编辑 DTO。 |
| 2026-06-21 | `Feature` | 添加费用抽屉外层列表新增「主提单号」「箱型箱量」列。 | 与新增页共用 `add-fee-modal`；`mblNum` 直出，`orderCtns` 经 `formatOrderCtnsDisplay` 汇总展示。 |
| 2026-06-20 | `Fix` | 编辑页打开添加费用抽屉时，列表查询不再传当前申请单 `Id`。 | 与新增页一致；已关联费用通过 `selectedFeeIds` 禁选，避免重复添加。 |
| 2026-06-20 | `Feature` | 选费抽屉与编辑页明细分组改为「业务+结算对象」；外层新增结算对象列，子表去掉该列；底部统计改为「共 X 组」。 | `PayAppFeeGroupDto` 补 `settlementId`/`settlement`；`groupKey`=`transportOrderId_settlementId`；单一结算对象锁定规则不变。 |
| 2026-06-20 | `Fix` | 费用明细列与添加费用抽屉中「结算单位」统一为「结算对象」，与主表字段一致。 | `form-data.ts` 内层列使用 `settlementNameColumn` i18n；`add-fee-modal` 搜索与表格列同步引用 `paymentApplication` 文案键。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application/:id/edit` 对应组件 `src/views/fee-management/payment-application/form.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
