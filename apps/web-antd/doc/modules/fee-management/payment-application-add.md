---
title: 付款申请新增
module: 费用管理
author: auto-doc-sync
last_updated: 2026-08-11
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

- **费用选择：** 从可申请费用中勾选生成付款申请；**新建时**进入页面后自动弹出添加费用抽屉（编辑模式不自动弹出）。抽屉内搜索区为五列布局，业务日期占两列，查询/重置按钮在币别条件同一行右侧；条件变更仍自动搜索。费用匹配支持「匹配 / 排除」：`FeeCodeIds` / `ExceptFeeCodeIds` 以 `paramsSerializer: 'repeat'` 传给 `GetOrderFeeGroupAsync`；排除模式须先选费用名称。外层业务列表展示委托编号、**主提单号**（`mblNum`）、**箱型箱量**（`orderCtns` 按箱型汇总，如 `20GP*2`）等字段。列表查询 `GetOrderFeeGroupAsync` **不传**当前申请单 `Id`，已选费用由前端 `selectedFeeIds` 禁选；**业务行父级全选仅作用于可选费用**，组内全部已添加时父级 Checkbox 禁用；支持 **收付类型** 筛选（默认「付」，清空则收付均返回）。「费用明细」右侧展示已选笔数与按币别本次申请净额合计（付 − 收）；勾选写入 `selectedFeeCache`，**翻页保留勾选与合计**，确认添加也读缓存（搜索条件变化仍清空）。**付费申请场景**抽屉启用 `enableInvoiceProcess`，须在抽屉内选定「发票方式」后才可确认费用并创建申请；未选时顶部 toast 提示，下拉标红但不插入行内错误文案。抽屉与页内费用明细表（`NestedDataTable`）均支持表头拖拽调列宽。
- **页面布局：** 按 Figma 重排为顶栏申请号/操作、申请人信息、费用合计与银行、费用明细与工作流分区；费用明细改用 `NestedDataTable`（`fillHeight`，外层订单组 + 内层费用行，可展开，卡片固定高度 650px）；「+ 添加费用」为 primary 醒目按钮。
- **费用页内筛选：** 已选费用明细支持按委托编号、费用名（`FeeCodeSelect` → `FeeCodeAdmin/GetPagedListAsync`，按 `feeCodeId`）、委托单位（`clientId`）、币别、ETD 过滤展示（仅过滤本地 `orderGroups`，不重新请求选费接口）。费用名/币别会裁剪组内 `children`（`filterOrderGroups`），只显示命中费用并重算外层申请合计。筛选栏勿用 `<label>` 包裹可搜索 Select，以免抢焦点清空远程搜索词。
- **金额汇总：** 根据费用明细计算申请金额；外层分组表在客服列后动态展示「{币别}申请合计」列（按 `currencyId` 升序，无该币别费用显示 `0.00`）。**固定结算币别**时，结算币别卡片只展示一行固定支付币别，申请金额为费用明细「申请金额折币」按付 − 收合计。
- **费用合计按币别绑定结算银行：** 费用合计区每个币别需绑定结算对象开票信息中维护的银行账户。银行来源 `ClientInvoiceInfoAdmin/GetListAsync`，按币别筛选；默认选中该币别默认账户（`isDefault`），多账户可下拉切换，选中后展示开户行 / 账号 / SWIFT Code。**原币结算**每种费用币别各需一条对应币别银行；**指定币别结算**仅需结算币别一条银行。银行为**必填**，提交/保存前校验。提交字段为 `paymentApplicationBanks`，编辑为全量替换。**新建抽屉确认自动 `AddAsync` 时**须按即将写入的费用行（`nextRows`）解析币别并补默认银行再提交，不可读当时仍为空的 `feeDetailRows`，否则跳转编辑后银行空白。
- **发票附件分组：** 右侧附件区按附件明细类型分组上传；支持点击右上角按钮或**拖拽文件到对应类型卡片**；先通用上传得 `attachmentId`，新建随 `AddAsync.attachmentGroup` 一并绑定。关联结算附件不在本页维护。
- **提交保存：** 保存成功后跳转对应编辑页，并带 `query.fromCreate=1`，供编辑页延迟拉取审核流程。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入新建路由 | 添加费用抽屉打开 | 自动弹出，引导用户先选费用；编辑路由不触发。 |
| 页面初始 | 用户进入编辑路由 | 页面可用 | 加载已有申请详情，不自动打开抽屉。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **费用明细** | 付款申请的数据来源。 | `payment-application/form-data.ts` | **触发/依赖：** 决定申请金额和供应商/客户口径。 | 需过滤不可申请或已申请费用。 |
| **申请金额** | 结算币别卡片展示的申请净额（原「付款金额」）。 | **原币：** `summarizeByCurrency`（付 − 收）<br/>**固定币别：** `calcAppliedConvertedTotal`（各行申请金额折币之和） | **触发/依赖：** 随费用明细增删、申请汇率变化。 | 收为负向；明细提交仍为正数 `appliedAmount`。 |
| **申请金额折币** | 费用明细内层列：本次申请金额 × 申请汇率。 | 前端 `calcAppliedAmountConverted(appliedAmount, rate)` | **触发/依赖：** 仅指定结算币别时展示。 | 四舍五入两位小数；已替换旧「申请折币」（原费用金额 × 汇率）。 |
| **已核销金额** | 费用明细：该费用已核销累计。 | 费用 `settledAmount`；列文案 `settledAmountLabel` | **触发/依赖：** 只读。 | 与结算币别「已核销」同字段族，展示粒度不同（行 vs 币别）。 |
| **可申请金额** | 费用明细/添加费用抽屉：还能申请付款的原币余额。 | `unRqstPaymentAmount`；列文案 `unSettledAmountLabel` | **触发/依赖：** 抽屉「本次申请」默认与上限均取此值。 | 本次申请必须 >0 且 ≤ 可申请金额。 |
| **本次申请** | 添加费用抽屉可编辑列；确认后写入明细 `appliedAmount`。 | 用户输入 / 默认 `unRqstPaymentAmount` | **触发/依赖：** 编辑模式确认即 `PayAppItemAddAsync`。 | 原「本次结算」文案已废弃。 |
| **已核销** | 结算币别卡片：支付币别已核销量。 | 详情 `currencyGroup[].settledAmount` | **触发/依赖：** 原币按费用币别 id；固定币别按结算币别 id；新建为 0。 | 只读展示。 |
| **申请主体** | 付款对象与业务归属。 | `payment-application-admin.ts` | **触发/依赖：** 影响审核和后续结算。 | 不能为空。 |
| **结算银行** | 费用合计每个币别绑定的收款银行账户。 | **客户开票信息**<br/>`ClientInvoiceInfoAdmin/GetListAsync` | **触发/依赖：** 选项随结算对象与币别筛选；结算对象变更清空重载；默认选中该币别 `isDefault` 账户。 | **必填项**，原币结算每种费用币别各一条、指定币别结算仅结算币别一条；银行须属当前结算对象且主数据含开户行/账号/SWIFT。 |
| **发票方式** | 先票后付 / 先付后票 / 不开票。 | 表单 `invoiceProcess`；添加费用抽屉 `enableInvoiceProcess` | **触发/依赖：** 抽屉确认时回写外层；新建确认费用与保存/提交前校验；未选时 toast + 控件标红。 | **必填项**（新建创建申请前必须选定）。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请新增一致性]** 新增申请最重要的是避免重复选择费用和金额口径错误。

> [!IMPORTANT] **[卡点 2：结算银行必填且币别口径严格]** 原币结算每种费用币别必须各选一条对应币别银行，指定币别结算必须且仅选一条结算币别银行；`bankSelections` 在原币模式以费用币别 id 为键、指定币别模式以结算币别 id 为键，编辑回填与提交需按当前模式取键，混用会导致校验失败。

> [!IMPORTANT] **[卡点 3：发票方式必选]** 未选定 `invoiceProcess` 时，添加费用确认与新建保存/提交均拦截（toast「请选择发票方式」），不会调用 `AddAsync`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-11 | `Feature` | 附件分组卡片支持拖拽上传（可多文件），空态提示「点击或拖拽上传」。 | `attachment-groups.vue` 卡片级 drop zone；`getGroupItems` 防多文件覆盖。详见 `changelogs/change-log-2026-08-11-payment-application-attachment-drag-upload.md`。 |
| 2026-08-11 | `Fix` | 添加费用抽屉与底部费用明细起运港/目的港改为展示港口备注。 | `resolvePol/PodPortDisplayName` 读 `seaExport.*Remark` / 平铺 `*Remark`；空备注不回退港口名。详见 `changelogs/change-log-2026-08-11-payment-application-fee-port-remark.md`。 |
| 2026-08-11 | `Fix` | 费用明细按费用名称/币别筛选后，内层只显示命中费用，同组其他费用隐藏。 | `filterOrderGroups` 裁剪 `children` 并重算申请合计；详见 `changelogs/change-log-2026-08-11-payment-application-fee-name-filter-children.md`。 |
| 2026-08-11 | `Fix` | 新建确认费用自动创建后跳转编辑页，银行账户可正确默认回显。 | `resolveBankCurrencies(nextRows)` + 创建前补默认银行；详见 `changelogs/change-log-2026-08-11-payment-application-create-bank-missing.md`。 |
| 2026-08-10 | `Fix` | 添加费用抽屉与页内费用明细表支持拖拽调列宽。 | `NestedDataTable` 默认 `resizable`；详见 `changelogs/change-log-2026-08-10-drawer-table-column-resize.md`。 |
| 2026-08-09 | `Fix` | 详情费用分组起运港/目的港正确显示（读 `transportOrder.seaExport.pol/pod`）。 | `resolvePol/PodPortDisplayName` 优先嵌套 `seaExport`；「可申请金额」≠ `unSettledAmount`。详见 `changelogs/change-log-2026-08-09-payment-application-detail-port-from-sea-export.md`。 |
| 2026-08-09 | `Fix` | 原始币别等展示改为直读接口 `currency.code`，删除前端中文名硬编码映射。 | 删除 `toCurrencyDisplayCode`；`CurrencySelect` 的 `labelKey=code` 不再回退中文名。详见 `changelogs/change-log-2026-08-09-payment-application-currency-code-from-api.md`。 |
| 2026-08-09 | `Fix` | 添加费用抽屉与费用分组表「委托单位」正确显示客户简称。 | `buildOrderRow` / `mapDetailToFeeRows` 读 `client?.name`；详见 `changelogs/change-log-2026-08-09-payment-application-order-client-name-display.md`。 |
| 2026-08-09 | `Feature` | 添加费用抽屉「费用明细」旁展示已选笔数与按币别本次申请合计；翻页保留勾选，确认也读跨页缓存。 | `selectedFeeCache` + `getSelectedFees`；详见 `changelogs/change-log-2026-08-09-payment-add-fee-selected-currency-total.md`。 |
| 2026-08-09 | `Style` | 表单容器底部间距由 10px 调整为 48px，避免滚到底贴边。 | 与编辑页共用 `.payment-app-form`；详见 `changelogs/change-log-2026-08-09-payment-application-form-bottom-padding.md`。 |
| 2026-08-09 | `Style` | 费用明细「结算金额」→「已核销金额」；`unRqstPaymentAmount` 展示「可申请金额」；添加费用抽屉「本次结算」→「本次申请」。 | 详见 `changelogs/change-log-2026-08-09-payment-application-amount-labels.md`。 |
| 2026-08-09 | `Feature` | 结算币别「付款金额」改「申请金额」并加「已核销」；固定币别合并为一行，申请金额取申请金额折币合计；费用明细改「申请金额折币」。 | `calcAppliedConvertedTotal` / `calcAppliedAmountConverted`；详见 `changelogs/change-log-2026-08-09-payment-application-settlement-applied-converted.md`。 |
| 2026-08-09 | `Fix` | 指定币别结算表移除「实付金额」「结算方式」列。 | 与编辑页共用 `form.vue`；详见 `changelogs/change-log-2026-08-09-payment-application-remove-settlement-columns.md`。 |
| 2026-08-09 | `Refactor` | 添加费用抽屉费用代码/币别/结算对象改读嵌套对象。 | `add-fee-modal` 映射与 `resolveCurrencyCode`/`resolveGroupSettlementName` 改走 `feeCode`/`currency`/`settlement`；`NestedDataTable` 兜底不支持数组 `dataIndex`，「费用名称」用显式 `column.key` 分支。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-09 | `Fix` | 结算币别「付款金额」及费用「{币别}申请合计」按付 − 收汇总；收费用计入负向。 | `signedAppliedAmount` + `summarizeByCurrency*`；明细仍提交正数 `appliedAmount`。详见 `changelogs/change-log-2026-08-09-payment-application-pay-minus-receive.md`。 |
| 2026-08-09 | `Fix` | 「发票制作方式」改名为「发票方式」并加必填 `*`；未选时 toast 提示；「+ 添加费用」改为 primary。 | 不在下拉旁插行内错误文案以免改布局。详见 `changelogs/change-log-2026-08-09-payment-application-invoice-process-label.md`。 |
| 2026-08-08 | `Fix` | 费用明细「费用名称」改为货代费用下拉（`FeeCodeSelect`）；输入关键字可远程检索；筛选栏改为 `div` 包裹。 | 删除无引用的 `FeeNameSelect`。详见 `changelogs/change-log-2026-08-08-payment-application-fee-filter-fee-code-select.md`。 |
| 2026-08-08 | `Fix` | 原始币别及「{币别}未收/未付」等展示统一为英文代码（如 RMB/USD）。 | 新增 `toCurrencyDisplayCode`；详见 `changelogs/change-log-2026-08-08-payment-application-currency-display-code.md`。 |
| 2026-08-02 | `Fix` | 费用明细 NestedDataTable 展开列固定 32px，宽容器下不再被撑开。 | 与编辑页共用组件；详见 `changelogs/change-log-2026-08-02-nested-data-table-expand-col-width.md`。 |
| 2026-08-02 | `Fix` | 添加费用「排除」模式生效；未选费用名称时提示并阻断查询。 | `paramsSerializer: 'repeat'` 绑定 `ExceptFeeCodeIds`。详见 `changelogs/change-log-2026-08-02-payment-add-fee-exclude-params-serializer.md`。 |
| 2026-07-29 | `Feature` | 添加费用抽屉内必选发票制作方式；未选不创建申请。 | `enableInvoiceProcess` + `ensureInvoiceProcessSelected`；详见 `changelogs/change-log-2026-07-29-payment-application-invoice-process-in-add-fee.md`。 |
| 2026-07-28 | `Fix` | 新增保存成功跳编辑时带 `fromCreate=1`，编辑页延迟 2s 拉取审核流程。 | 与编辑页共用；详见 `changelogs/change-log-2026-07-28-payment-application-workflow-delay.md`。 |
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
