---
title: 付款申请新增
module: 费用管理
author: auto-doc-sync
last_updated: 2026-07-28
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

- **费用选择：** 从可申请费用中勾选生成付款申请；**新建时**进入页面后自动弹出添加费用抽屉（编辑模式不自动弹出）。抽屉内搜索区为五列布局，业务日期占两列，查询/重置按钮在币别条件同一行右侧；条件变更仍自动搜索。外层业务列表展示委托编号、**主提单号**（`mblNum`）、**箱型箱量**（`orderCtns` 按箱型汇总，如 `20GP*2`）等字段。列表查询 `GetOrderFeeGroupAsync` **不传**当前申请单 `Id`，已选费用由前端 `selectedFeeIds` 禁选；**业务行父级全选仅作用于可选费用**，组内全部已添加时父级 Checkbox 禁用；支持 **收付类型** 筛选（默认「付」，清空则收付均返回）。
- **页面布局：** 按 Figma 重排为顶栏申请号/操作、申请人信息、费用合计与银行、费用明细与工作流分区；费用明细改用 `NestedDataTable`（`fillHeight`，外层订单组 + 内层费用行，可展开，卡片固定高度 650px）。
- **费用页内筛选：** 已选费用明细支持按委托编号、费用名（`FeeNameSelect`）、委托单位（`clientId`）、币别、ETD 过滤展示（仅过滤本地 `orderGroups`，不重新请求选费接口）。
- **金额汇总：** 根据费用明细计算申请金额；外层分组表在客服列后动态展示「{币别}申请合计」列（按 `currencyId` 升序，无该币别费用显示 `0.00`）。
- **费用合计按币别绑定结算银行：** 费用合计区每个币别需绑定结算对象开票信息中维护的银行账户。银行来源 `ClientInvoiceInfoAdmin/GetListAsync`，按币别筛选；默认选中该币别默认账户（`isDefault`），多账户可下拉切换，选中后展示开户行 / 账号 / SWIFT Code。**原币结算**每种费用币别各需一条对应币别银行；**指定币别结算**仅需结算币别一条银行。银行为**必填**，提交/保存前校验。提交字段为 `paymentApplicationBanks`，编辑为全量替换。
- **发票附件分组：** 发票制作区按附件明细类型分组上传；先通用上传得 `attachmentId`，新建随 `AddAsync.attachmentGroup` 一并绑定。关联结算附件不在本页维护。
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
| **结算银行** | 费用合计每个币别绑定的收款银行账户。 | **客户开票信息**<br/>`ClientInvoiceInfoAdmin/GetListAsync` | **触发/依赖：** 选项随结算对象与币别筛选；结算对象变更清空重载；默认选中该币别 `isDefault` 账户。 | **必填项**，原币结算每种费用币别各一条、指定币别结算仅结算币别一条；银行须属当前结算对象且主数据含开户行/账号/SWIFT。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请新增一致性]** 新增申请最重要的是避免重复选择费用和金额口径错误。

> [!IMPORTANT] **[卡点 2：结算银行必填且币别口径严格]** 原币结算每种费用币别必须各选一条对应币别银行，指定币别结算必须且仅选一条结算币别银行；`bankSelections` 在原币模式以费用币别 id 为键、指定币别模式以结算币别 id 为键，编辑回填与提交需按当前模式取键，混用会导致校验失败。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-28 | `Fix` | 费用明细卡片固定高度 650px，表格在卡片内占满剩余空间并内部滚动。 | 与编辑页共用 `form.vue`；`fee-detail-card` + `NestedDataTable.fillHeight`；详见 `changelogs/change-log-2026-07-28-payment-application-fee-table-fill-height.md`。 |
| 2026-07-28 | `Feature` | 发票附件按分组本地维护，随 `AddAsync.attachmentGroup` 一并绑定；结算附件不在申请侧维护。 | 上传只拿 `attachmentId`；详见 `changelogs/change-log-2026-07-28-payment-application-attachment-group-save.md`。 |
| 2026-07-28 | `Feature` | 表单按 Figma 重排；费用明细改用 `NestedDataTable`；支持编号/费用名/委托单位/币别/ETD 页内筛选；选费透传 `clientId`。 | 新增/编辑共用 `form.vue`；`FeeNameSelect` 从 adapter 导出；详见 `changelogs/change-log-2026-07-28-payment-application-figma-layout-nested-table.md`。 |
| 2026-07-24 | `Refactor` | 添加费用抽屉业务行委托单位改读 `PayAppFeeGroupDto.client?.name`（已无扁平 `clientName`）。 | 与后端 `TransportOrderDto` 往来单位对象化对齐；`add-fee-modal`/`add-fee-statement-modal` 同步。详见 `changelogs/change-log-2026-07-24-sea-export-party-carrier-objectification.md`。 |
| 2026-07-12 | `Fix` | 「未结金额」改用 `unRqstPaymentAmount`；「本次结算」不得超过未结金额。 | 与编辑页共用 `add-fee-modal`；`InputNumber` 设 `max`，确认前 `validateAppliedAmounts`。 |
| 2026-07-12 | `Fix` | 添加费用抽屉业务行父级全选不再勾选已禁选费用；组内费用均已添加时父级 Checkbox 禁用。 | `getSelectableGroupFees` 过滤 `disabledFeeIds`；`toggleGroup`/`isGroupChecked`/`isGroupIndeterminate` 仅基于可选费用。 |
| 2026-06-28 | `Feature` | 费用合计每个币别新增结算银行下拉（来源开票信息 `GetListAsync`），默认选中默认账户、可切换、必填，选中展示开户行/账号/SWIFT；提交携带 `paymentApplicationBanks`，编辑全量替换。 | 复用 `getClientInvoiceInfoList` 扁平化 `clientInvoiceBanks`；`bankCurrencies` 区分原币/指定币别口径；`applyDefaultBankSelections` 补默认；`restoreBankSelectionsFromDetail` 从 `currencyGroup[].paymentApplicationBank` 回填；API 新增 `PaymentApplicationBank*` DTO 与 `CurrencyGroupDto.paymentApplicationBank`。 |
| 2026-06-21 | `Feature` | 添加费用抽屉外层列表新增「主提单号」「箱型箱量」列。 | `formatOrderCtnsDisplay` 汇总 `orderCtns`；`PayAppFeeGroupDto.orderCtns` 类型补全。 |
| 2026-06-20 | `Feature` | 费用明细外层分组表新增按原币动态列「{币别}申请合计」，列随已申请费用币别生成。 | `collectAppliedCurrencies` + `buildAppliedAmountCurrencyColumns`；`groupFeesByOrder` 写入 `applied_amount_{currencyId}` 字段。 |
| 2026-06-20 | `Fix` | 已添加费用禁选时「本次结算」不再默认未结金额，展示申请单已有金额。 | `resolveAppliedAmount` + `selectedAppliedAmounts`；全选/单选跳过禁选费用写默认值。 |
| 2026-06-20 | `Fix` | 添加费用抽屉查询 `GetOrderFeeGroupAsync` 不再传申请单 `Id`；已选费用仍由 `selectedFeeIds` 前端禁选。 | 移除 `AddFeeDrawerProps.paymentApplicationId` 及 `fetchData` 中 `Id` 参数。 |
| 2026-06-20 | `Feature` | 添加费用抽屉按「业务+结算对象」分组展示；外层显示结算对象全称，分页 total 为分组数。 | 与 `GetOrderFeeGroupAsync` 新 DTO 对齐；`row-key` 使用 `${transportOrderId}_${settlementId}`。 |
| 2026-06-16 | `feat` | 申请页去除与 Page 重复 padding；添加费用抽屉搜索区五列布局、业务日期占两列、查询重置紧跟币别右对齐。 | 搜索按钮通过 Vben `FormActions` + `col-start-4 col-span-2` 嵌入网格，避免破坏第二行对齐。 |
| 2026-06-16 | `feat` | 新建付费申请（`/add`）挂载后自动打开添加费用抽屉；编辑页行为不变。 | 实现方式与 `payment-settlement/form.vue` 新建自动开抽屉一致：`onMounted` + `nextTick` + `handleOpenAddFee`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application/add` 对应组件 `src/views/fee-management/payment-application/form.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
