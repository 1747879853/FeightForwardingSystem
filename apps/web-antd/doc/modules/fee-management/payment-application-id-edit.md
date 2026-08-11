---
title: 付款申请编辑
module: 费用管理
author: auto-doc-sync
last_updated: 2026-08-11
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
- **审核流程：** 右侧 `WorkflowTimeline` 按 `entityId` 拉取工作流；若路由带 `fromCreate=1`（新增刚保存跳入），延迟 2 秒再请求，避免实例尚未创建。提交/撤销提交成功并刷新详情后，递增 `workflowReloadKey` 强制重挂载并带 `loadDelayMs=2000`，等待审核流状态落库。
- **页面布局：** 与新增页共用 `form.vue` 的 Figma 布局（顶栏申请号、状态章、费用合计/银行、`NestedDataTable` 费用明细与工作流分区）。
- **发票附件：** 任意状态本地增删，保存走 `EditAsync.attachmentGroup` **全量覆盖**；关联结算附件从详情 `paymentSettlements[].attachments` 展平后只读展示（不再有平铺字段 `paymentSettlementAttachments`）。
- **结算银行 / 发票制作：** 不随申请状态禁用；编辑态任意状态可点「保存」落库。详情加载时先回填 `currencyGroup[].paymentApplicationBank`，再 `applyDefaultBankSelections` 补齐缺失币别（兼容新增漏带银行的历史单）。
- **维护明细：** 在状态允许时通过「添加费用」抽屉增删费用；申请金额在抽屉「本次申请」列填写，确认后编辑模式立即调用 `PayAppItemAddAsync` 保存并提示「保存成功」。抽屉「费用明细」旁展示已选笔数与按币别本次申请合计；勾选跨页保留，确认读 `selectedFeeCache`。
- **外侧费用明细：** 使用 `NestedDataTable`（`fillHeight`）展示，费用明细卡片固定高度 `650px`，表格占满卡片内剩余空间并内部滚动；表头可拖拽调列宽；「本次申请金额」只读；支持编号/费用名（`FeeCodeSelect`）、委托单位/币别/ETD 页内筛选。费用名/币别筛选会裁剪组内费用行（`filterOrderGroups`），同组未命中费用不显示，外层申请合计按可见行重算。
- **提交审核：** 录入中（`Entering`）或已驳回（`Rejected`）时顶部显示「提交」，调用 `SubmitAsync` 重新进入审核链路。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作      | 目标状态 | 状态说明                           |
| :------- | :--------------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由     | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |
| 录入中   | 点击「提交」     | 审核中   | `SubmitAsync`。                    |
| 已驳回   | 点击「提交」     | 审核中   | 与录入中相同提交链路，可再次送审。 |
| 审核中   | 点击「撤销提交」 | 录入中   | `UnSubmitAsync`。                  |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **申请单 ID** | 编辑上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载付款申请详情。 | 必须有效。 |
| **审核状态** | 控制是否可编辑。 | `PaymentApplicationStatus` | **触发/依赖：** 与付款审核页面联动。 | 审核中或已完成状态不应随意修改。 |

| **结算对象** | 付款申请及费用明细的结算客户。 | `settlementId` / `settlement`（`ClientSimpleDtoForOrder`） | **触发/依赖：** 主表 `ClientSelect` 编辑回显传 `selected-items`（用 `settlement`）；选择后锁定添加费用抽屉筛选；费用内层列展示 `settlementName`。 | 已有费用时不可清空；勿再读已删除的 `clientName`。 |

| **结算币别** | 申请结算币别。 | `currencyId` / `currency`（`CurrencySimpleDto`） | **触发/依赖：** 展示名取 `currency.code`；原币申请时 `currency` 为 null。 | 勿再读已删除的 `currencyCode`。 |

| **费用分组** | 编辑页与选费抽屉外层列表的分组维度。 | `GetOrderFeeGroupAsync` / 本地 `groupFeesByOrder` | **触发/依赖：** 按「业务 + 结算对象」联合分组；`row-key` 为复合键。 | 同一业务可对应多行（不同结算对象）；底部统计为组数非票数。 |

| **本次申请金额** | 单条费用本次申请付款金额（抽屉列「本次申请」）。 | 添加费用抽屉 `appliedAmount` → `PayAppItemAddAsync` | **触发/依赖：** 仅在抽屉内编辑；外侧明细只读展示。 | 默认取 `unRqstPaymentAmount`（可申请金额）；不得超过可申请金额；编辑模式确认添加即落库。 |

| **所属公司** | 申请单归属组织（编辑态只读）。 | 详情 `orgs` + `orgId` | **触发/依赖：** 编辑页用 `formatOrgPathLabel(orgs)` 拼接全路径（`/` 分隔）；新增页用 `MyOrgSelect`。 | 必填（提交带 `orgId`）。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请编辑一致性]** 编辑页必须尊重申请状态，不能绕过审核状态直接修改已进入流程的数据。

> [!IMPORTANT] **[卡点 2：新增跳入时工作流实例时序]** 新增保存后立即跳编辑时，工作流实例可能尚未落库；须带 `fromCreate=1` 并延迟 2s 再拉 `WorkflowTimeline`，否则会误显示「暂无审批流程数据」。

> [!IMPORTANT] **[卡点 3：提交/撤销后审核流时序]** 提交或撤销提交后后端审核流可能尚未更新；须在详情刷新后通过递增 key 重挂载 `WorkflowTimeline` 并延迟 2s 再拉，避免读到旧流程。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-11 | `Fix` | 费用明细按费用名称/币别筛选后，内层只显示命中费用，同组其他费用隐藏。 | `filterOrderGroups` 裁剪 `children` 并重算申请合计；详见 `changelogs/change-log-2026-08-11-payment-application-fee-name-filter-children.md`。 |
| 2026-08-11 | `Fix` | 新增跳转编辑后银行账户不再空白；详情无银行时用开票默认账户补齐。 | `restoreBankSelectionsFromDetail` 后再次 `applyDefaultBankSelections`；详见 `changelogs/change-log-2026-08-11-payment-application-create-bank-missing.md`。 |
| 2026-08-10 | `Fix` | 已驳回申请编辑页恢复「提交」按钮，可再次送审。 | `canSubmit = Entering \| Rejected`；详见 `changelogs/change-log-2026-08-10-payment-application-reject-resubmit.md`。 |
| 2026-08-10 | `Fix` | 添加费用抽屉与页内费用明细表支持拖拽调列宽。 | `NestedDataTable` 默认 `resizable`；详见 `changelogs/change-log-2026-08-10-drawer-table-column-resize.md`。 |
| 2026-08-09 | `Fix` | 详情费用分组起运港/目的港正确显示（读 `transportOrder.seaExport.pol/pod`）。 | `resolvePol/PodPortDisplayName` 优先嵌套 `seaExport`；「可申请金额」≠ `unSettledAmount`。详见 `changelogs/change-log-2026-08-09-payment-application-detail-port-from-sea-export.md`。 |
| 2026-08-09 | `Fix` | 原始币别等展示改为直读接口 `currency.code`，删除前端中文名硬编码映射。 | 删除 `toCurrencyDisplayCode`；`CurrencySelect` 的 `labelKey=code` 不再回退中文名。详见 `changelogs/change-log-2026-08-09-payment-application-currency-code-from-api.md`。 |
| 2026-08-09 | `Fix` | 添加费用抽屉与费用分组表「委托单位」正确显示客户简称。 | `buildOrderRow` / `mapDetailToFeeRows` 读 `client?.name`；详见 `changelogs/change-log-2026-08-09-payment-application-order-client-name-display.md`。 |
| 2026-08-09 | `Feature` | 添加费用抽屉「费用明细」旁展示已选笔数与按币别本次申请合计；翻页保留勾选，确认也读跨页缓存。 | 与新增页共用 `add-fee-modal`；详见 `changelogs/change-log-2026-08-09-payment-add-fee-selected-currency-total.md`。 |
| 2026-08-09 | `Style` | 表单容器底部间距由 10px 调整为 48px，避免滚到底贴边。 | 与新增页共用 `.payment-app-form`；详见 `changelogs/change-log-2026-08-09-payment-application-form-bottom-padding.md`。 |
| 2026-08-09 | `Style` | 费用明细「结算金额」→「已核销金额」；`unRqstPaymentAmount` 展示「可申请金额」；添加费用抽屉「本次结算」→「本次申请」。 | 详见 `changelogs/change-log-2026-08-09-payment-application-amount-labels.md`。 |
| 2026-08-09 | `Feature` | 结算币别「付款金额」改「申请金额」并加「已核销」；固定币别合并为一行，申请金额取申请金额折币合计；费用明细改「申请金额折币」。 | 与新增页共用 `form.vue`/`form-data.ts`；详情 `syncCurrencySettledAmounts`。详见 `changelogs/change-log-2026-08-09-payment-application-settlement-applied-converted.md`。 |
| 2026-08-09 | `Fix` | 指定币别结算表移除「实付金额」「结算方式」列。 | 与新增页共用 `form.vue`；详见 `changelogs/change-log-2026-08-09-payment-application-remove-settlement-columns.md`。 |
| 2026-08-09 | `Refactor` | 费用明细行与添加费用抽屉的费用代码/币别/结算对象改读嵌套对象。 | `PaymentApplicationAdminApi.OrderFeeDto` 已对象化；`form.vue` 的 `mapDetailToFeeRows`、`form-data.ts` 的 `resolveFeeCurrencyCode`、`add-fee-modal` 同步改造。任务项自有的 `item.feeCodeName`/`feeSettlementName` 不在范围内。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-09 | `Fix` | 结算币别「付款金额」及费用「{币别}申请合计」按付 − 收汇总；收费用计入负向。 | 与新增页共用 `form-data.ts` 的 `signedAppliedAmount`。详见 `changelogs/change-log-2026-08-09-payment-application-pay-minus-receive.md`。 |
| 2026-08-09 | `Fix` | 「发票方式」文案与必填标红；未选 toast 提示；费用明细「+ 添加费用」改为 primary。 | 与新增页共用 `form.vue` / `add-fee-modal`。详见 `changelogs/change-log-2026-08-09-payment-application-invoice-process-label.md`。 |
| 2026-08-08 | `Fix` | 费用明细「费用名称」筛选改用 `FeeCodeSelect`（货代费用 API）；筛选栏 `label` 改为 `div`。 | 与新增页共用 `form.vue`；详见 `changelogs/change-log-2026-08-08-payment-application-fee-filter-fee-code-select.md`。 |
| 2026-08-02 | `Fix` | 费用明细 NestedDataTable 展开列固定 32px，宽容器下不再被撑开。 | 最后一列 `<col>` 不设宽吸收剩余空间；详见 `changelogs/change-log-2026-08-02-nested-data-table-expand-col-width.md`。 |
| 2026-08-02 | `Fix` | 提交/撤销提交成功后延迟 2s 再刷新右侧审核流程。 | `workflowReloadKey` 重挂载 + `loadDelayMs=2000`；详见 `changelogs/change-log-2026-08-02-payment-application-submit-workflow-delay.md`。 |
| 2026-07-30 | `Feature` | 详情结算对象/币别/结算附件改读对象化出参；结算附件从 `paymentSettlements[].attachments` 展平只读展示。 | 删除对 `clientName`/`currencyCode`/`paymentSettlementAttachments` 依赖。详见 `changelogs/change-log-2026-07-30-payment-application-settlement-objectified.md`。 |
| 2026-07-29 | `Feature` | 添加费用抽屉启用发票制作方式选择；提交/保存前校验已选。 | 与新增页共用 `ensureInvoiceProcessSelected`；详见 `changelogs/change-log-2026-07-29-payment-application-invoice-process-in-add-fee.md`。 |
| 2026-07-29 | `Fix` | 银行账户与发票制作取消按状态禁用；编辑态任意状态可保存。 | 去掉 `canEditBank` / `!isEntering` 禁用；附件始终本地全量保存；详见 `changelogs/change-log-2026-07-29-payment-application-bank-invoice-always-editable.md`。 |
| 2026-07-28 | `Fix` | 从新增跳入编辑时延迟 2s 再拉取审核流程，等待工作流实例创建。 | `query.fromCreate=1` + `WorkflowTimeline.loadDelayMs`；详见 `changelogs/change-log-2026-07-28-payment-application-workflow-delay.md`。 |
| 2026-07-28 | `Fix` | 费用明细卡片固定高度 650px，表格在卡片内占满剩余空间并内部滚动。 | `fee-detail-card` 固定高 + `NestedDataTable.fillHeight`；详见 `changelogs/change-log-2026-07-28-payment-application-fee-table-fill-height.md`。 |
| 2026-07-28 | `Feature` | 录入中附件随 `EditAsync.attachmentGroup` 全量覆盖；非录入 `AddAttachments` 追加；结算附件只读。 | 编辑始终传 `attachmentGroup`（可空）；详见 `changelogs/change-log-2026-07-28-payment-application-attachment-group-save.md`。 |
| 2026-07-28 | `Fix` | 编辑态「所属公司」展示 `orgs` 全路径（`/` 拼接），不再仅显示末端组织名。 | 复用 `formatOrgPathLabel`；详见 `changelogs/change-log-2026-07-28-payment-application-org-path-display.md`。 |
| 2026-07-28 | `Feature` | 表单按 Figma 重排；费用明细改用 `NestedDataTable`；支持页内筛选；选费透传 `clientId`。 | 与新增页共用 `form.vue`；详见 `changelogs/change-log-2026-07-28-payment-application-figma-layout-nested-table.md`。 |
| 2026-07-25 | `Fix` | 编辑页结算对象下拉正确回显客户简称（`测试正式客户简称` 等）。 | `ClientSelect` 注入 `selected-items`；详情优先用 `settlement` 对象，缺省用 `settlementId`+`clientName`。详见 `changelogs/change-log-2026-07-25-payment-application-settlement-selected-items.md`。 |
| 2026-07-24 | `Refactor` | 编辑页添加费用抽屉委托单位改读 `PayAppFeeGroupDto.client?.name`。 | 与新增页同源 `add-fee-modal`。详见 `changelogs/change-log-2026-07-24-sea-export-party-carrier-objectification.md`。 |
| 2026-07-12 | `Fix` | 「未结金额」改用 `unRqstPaymentAmount`；「本次结算」不得超过未结金额。 | `add-fee-modal` 列与默认值、`validateAppliedAmounts`；外侧明细 `form-data.ts` 同步字段。 |
| 2026-07-12 | `Fix` | 外侧费用明细「本次申请金额」改为只读；编辑模式添加费用 `PayAppItemAddAsync` 成功后提示「保存成功」。 | 申请金额以抽屉 `appliedAmount` 为唯一编辑入口；移除 `onAppliedAmountChange`。 |
| 2026-06-28 | `Feature` | 费用合计每个币别新增结算银行下拉（必填、默认选中默认账户、可切换、展示开户行/账号/SWIFT）；编辑保存经 `EditAsync` 全量替换 `paymentApplicationBanks`，详情按 `currencyGroup[].paymentApplicationBank` 回填。 | 与新增页共用 `form.vue`；`restoreBankSelectionsFromDetail` 区分原币（按币别 id）/指定币别（结算币别共享）回填；`saveEditMode` 携带银行编辑 DTO。 |
| 2026-06-21 | `Feature` | 添加费用抽屉外层列表新增「主提单号」「箱型箱量」列。 | 与新增页共用 `add-fee-modal`；`mblNum` 直出，`orderCtns` 经 `formatOrderCtnsDisplay` 汇总展示。 |
| 2026-06-20 | `Fix` | 编辑页打开添加费用抽屉时，列表查询不再传当前申请单 `Id`。 | 与新增页一致；已关联费用通过 `selectedFeeIds` 禁选，避免重复添加。 |
| 2026-06-20 | `Feature` | 选费抽屉与编辑页明细分组改为「业务+结算对象」；外层新增结算对象列，子表去掉该列；底部统计改为「共 X 组」。 | `PayAppFeeGroupDto` 补 `settlementId`/`settlement`；`groupKey`=`transportOrderId_settlementId`；单一结算对象锁定规则不变。 |
| 2026-06-20 | `Fix` | 费用明细列与添加费用抽屉中「结算单位」统一为「结算对象」，与主表字段一致。 | `form-data.ts` 内层列使用 `settlementNameColumn` i18n；`add-fee-modal` 搜索与表格列同步引用 `paymentApplication` 文案键。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application/:id/edit` 对应组件 `src/views/fee-management/payment-application/form.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
