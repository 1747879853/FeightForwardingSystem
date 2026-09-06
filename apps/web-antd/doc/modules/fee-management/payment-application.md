---
title: 付款申请列表
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-06
---

# 1. 业务背景说明 (Background)

**白话解释：** 付款申请列表用于查询、创建、勾选后提交/撤销，并进入付款申请单编辑，是应付费用付款流程入口。对已部分结算/结算完毕的申请，可点击状态查看关联付费结算明细与附件。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/payment-application` |
| 路由名称 | `PaymentApplicationList` |
| 页面组件 | `src/views/fee-management/payment-application/list.vue` |
| 权限口径 | Admin.PaymentApplication / Admin.PaymentApplication.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/payment-application/settlement-detail-modal.vue`<br/>`src/views/fee-management/payment-application/invoice-edit-modal.vue`<br/>`src/api/settlement-management/payment-application-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **申请单查询：** 按申请状态、客户/供应商、币别、时间等条件查询付款申请（筛选项「币别」保留）。
- **主提单号 / 委托编号列：** 分别从本行 `payAppFeeBySeaExportGroup[].transportOrder.mblNum`、`commissionNum` 保序去重后逗号拼接，默认插在申请单号后；过长省略号。组内金额字段不要用来展示。
- **创建申请：** 进入新增页选择可申请付款的费用。
- **提交申请：** 勾选未提交或驳回的申请，点工具栏「提交」，走 `SubmitAsync`，状态变为已提交并启动审批工作流。先票后付且发票子表为空时前端先拦，提示提交前必须录入发票。
- **撤销申请：** 勾选已提交且审批尚未开始的申请，点工具栏「撤销」，走 `UnSubmitAsync`，状态回到未提交并删除工作流。
- **编辑申请：** 双击行进入编辑页维护申请单明细。
- **申请合计列：** 列表按当前页 `currencyGroup` 动态展示各币别「{币别}申请合计」列，承接编辑页结算币别卡片的汇总口径；列配置面板仅保留「申请合计」锚点项，其余币别跟随列自动跟随显隐与顺序。默认插在「开票日期」之后。
- **结算明细弹窗：** 申请状态为「部分结算」「结算完毕」时，点击状态 Tag 弹出关联结算列表（单号/时间/结算对象/币别/金额/附件）；数据来自列表行 `paymentSettlements`，无需再请求详情。
- **补录发票弹窗：** 发票流程不是「不开票」时，点击「发票流程」打开维护弹窗（发票流程 + 可增删的发票明细表 + 申请附件）；每行含发票号、开票日期、销售方抬头、发票金额、单个附件，底部展示发票总额（前端求和）；附件可识别预填该行票号、日期、抬头与金额，保存走 `EditInvoiceAsync`，不判断申请 status，也不要求先票后付当场有票。发票子表与 `attachmentGroup` 都是全量覆盖。
- **批量下载发票：** 勾选付费申请后点「批量下载发票」，传申请 id 调 `DownloadInvoicesAsync` 打 zip；单次最多 50 条；不开票行会先排除；部分缺附件时用 `missingInvoiceNos` 提示。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |
| 未提交 / 驳回 | 勾选后点「提交」 | 已提交 | 后端创建或重建审批任务与工作流；混选时只处理符合状态的行。 |
| 已提交 | 勾选后点「撤销」 | 未提交 | 审批已有人处理后接口拒绝；成功则删除任务与工作流。 |
| 部分结算 / 结算完毕 | 用户点击状态 Tag | 打开结算明细弹窗 | 其它状态不可点开结算明细。 |
| 任意申请状态 | 用户点击非「不开票」的发票流程 | 打开发票维护弹窗 | 先票后付/先付后票可点；保存不改变申请 status。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **申请状态** | 付款申请单当前处理阶段。 | `PaymentApplicationStatus` | **触发/依赖：** 部分结算/结算完毕可点击打开 `paymentSettlements` 弹窗。 | 状态流转以后端枚举为准。 |
| **主提单号** | 本申请涉及业务的主提单号，多票逗号拼接。 | `GetPagedListAsync` → `payAppFeeBySeaExportGroup[].transportOrder.mblNum` | **触发/依赖：** 空数组兜底；trim 后跳过空值并保序去重；`showOverflow`。 | 列表接口若未填充该分组则列为空。 |
| **委托编号** | 本申请涉及业务的内部委托编号，多票逗号拼接。 | `GetPagedListAsync` → `payAppFeeBySeaExportGroup[].transportOrder.commissionNum` | **触发/依赖：** 与主提单号同一分组、同一拼接口径。 | 列表接口若未填充该分组则列为空。 |
| **结算对象** | 申请结算客户简称。 | `settlement.name`（`ClientSimpleDtoForOrder`） | **触发/依赖：** 列表展示；勿再读已删除的 `clientName`。 | 客户不存在时为空。 |
| **关联结算** | 本申请关联的付费结算简要。 | `paymentSettlements[]` | **触发/依赖：** 含结算附件 `attachments`；`totalSettledPrice` 为整单金额。 | 无关联时为空数组。 |
| **发票流程** | 先票后付 / 先付后票 / 不开票。 | `invoiceProcess`（0/1/2，必填） | **触发/依赖：** 非不开票时可点击打开发票维护弹窗；先票后付提交前也可在此补票。 | 补录保存走 `EditInvoiceAsync`；提交时先票后付必须已有发票。 |
| **发票号 / 开票日期** | 一单可多张发票，列表逗号拼接。 | `paymentApplicationInvoices[].invoiceNo` / `invoiceDate` | **触发/依赖：** 列 `field` 仍用 `invoiceNo`/`invoiceDate` 以兼容旧列设置，展示走插槽拼接；筛选仍用 `InvoiceNo`/`InvoiceDateStart`/`InvoiceDateEnd`，命中任意一张即返回。 | 发票号最长 128，同一申请不可重复；列不可按主表字段排序。 |
| **销售方抬头** | 开票方在发票上的名称，多张逗号拼接。 | `paymentApplicationInvoices[].sellerHeader` | **触发/依赖：** 纯文本，不关联客户表；列表走插槽拼接。 | 最长 256；可空。 |
| **发票总额** | 本申请各张发票金额合计。 | 前端 `sumInvoiceAmounts(paymentApplicationInvoices)` | **触发/依赖：** 未填金额的行不计入；全部未填列为空；允许负数。不参与申请额度。 | 后端无此字段，不要当成接口出参。 |
| **{币别}申请合计** | 列表按币别展示的申请净额（付 − 收）。 | **原币：** `currencyGroup[].payAmount − receiveAmount`<br/>**固定币别：** 仅结算币别列 `totalPayPrice − totalReceivePrice` | **触发/依赖：** 当前页数据变化时动态生成列；模式由 `currencyId`（空/`0`=原币）判定。 | 固定币别其它币别列留空；两侧总额都空留空。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请列表一致性]** 付款申请需保证费用选择、申请金额和审核状态一致，避免重复申请或超额申请。

> [!IMPORTANT] **[卡点 2：出参对象化破坏性变更]** 勿再兼容 `clientName` / `currencyCode` / `paymentSettlementAttachments`；结算附件仅在 `paymentSettlements[].attachments`，与申请自身 `attachmentGroup` 模块不同。

> [!IMPORTANT] **[卡点 3：EditInvoice 全量覆盖]** 保存发票信息时须带回当前全部 `paymentApplicationInvoices` 与 `attachmentGroup`，否则未传的发票行和申请附件会被清空；勿与仅录入/驳回可用的 `EditAsync` 混用预期。

> [!IMPORTANT] **[卡点 4：申请合计分口径]** 列表不要用前端重算汇率；原币读 `currencyGroup` 原币量，固定币别读整单 `totalPayPrice/totalReceivePrice`，且只填本单结算币别列。

> [!IMPORTANT] **[卡点 5：列表提交/撤销状态闸]** 提交仅 `Entering`/`Rejected`，撤销仅 `Auditing`；列表提交不先保存单据。撤销时若工作流已有人审过，后端返回「审核流程进行中 不可撤回」。

> [!IMPORTANT] **[卡点 6：先票后付发票只卡提交]** 列表提交前按 `paymentApplicationInvoices` 有无票号判断，不能看 `invoiceProcess` 当已有票。混选时跳过无票的先票后付行。提交只能走 `SubmitAsync`，不要传 `status=1`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-06 | `Feature` | 列表增加销售方抬头、发票总额列；补录弹窗可填抬头与金额，底部展示总额。识别回填价税合计到金额、`sellerHeader` 到抬头。 | 总额前端求和；抬头不是客户下拉。详见 `changelogs/change-log-2026-09-06-payment-application-invoice-seller-amount.md`。 |
| 2026-09-06 | `Fix` | 先票后付可先建单再补票；列表提交时才要求至少一条发票。先票后付也可点发票流程补录。 | 提交只走 `SubmitAsync`；按子表票号预判。详见 `changelogs/change-log-2026-09-06-payment-application-invoice-submit.md`。 |
| 2026-09-04 | `Feature` | 发票号/开票日期改读发票子表并支持一单多票；列表可批量下载发票附件。 | 主表 `invoiceNo`/`invoiceDate` 已删除；展示从 `paymentApplicationInvoices` 拼接。详见 `changelogs/change-log-2026-09-04-payment-application-invoice-subtable.md`。 |
| 2026-08-31 | `Fix` | 列表「提单号」改为「主提单号」，并增加「委托编号」；多票逗号拼接，过长省略。 | TAPD 1000910（不含付费结算）；与审批列表共用 `formatPayAppCommissionNums`。详见 `changelogs/change-log-2026-08-31-payment-app-review-mbl-commission.md`。 |
| 2026-08-29 | `Feature` | 列表新增「提单号」列：从 `payAppFeeBySeaExportGroup` 取各票 `mblNum`，逗号拼接，插在申请单号后。 | 与审批列表共用 `formatPayAppMblNums`。`GetPagedListAsync` 目前注释仍为「详情才有 列表没有」，接口未填分组时列为空。详见 `changelogs/change-log-2026-08-29-payment-application-list-mbl-nums.md`。 |
| 2026-08-24 | `Feature` | 列表工具栏增加「提交」「撤销」：勾选未提交/驳回可提交进入审批，勾选已提交可撤销回未提交。 | 复用编辑页 `SubmitAsync`/`UnSubmitAsync`；混选只处理符合状态的行。详见 `changelogs/change-log-2026-08-24-payment-application-list-submit-revoke.md`。 |
| 2026-08-19 | `Feature` | 列表「维护发票信息」弹窗的发票附件可识别并预填发票号/开票日期，点确定才保存。 | 与编辑页共用 `attachment-groups.vue`；详见 `changelogs/change-log-2026-08-19-payment-application-invoice-extract.md`。 |
| 2026-08-11 | `Feature` | 列表删除币别/应付总额/应收总额列；申请合计按原币与固定币别分口径，默认插在开票日期后。 | `calcRowAppliedTotal` + `isSpecifiedCurrencyApplication`；详见 `changelogs/change-log-2026-08-11-payment-application-list-applied-total-settlement.md`。 |
| 2026-08-10 | `Refactor` | 外联平铺字段改读 SimpleDto：选费港口/字典、详情明细费用名、任务列表结算与币别。 | 港口读对象；明细 `orderFee.feeCode/currency/settlement`；任务 `settlement.name` / `currency.code`。详见 `changelogs/change-log-2026-08-10-foreign-key-simple-dto-alignment.md`。 |
| 2026-08-09 | `Fix` | 「{币别}申请合计」改为付申请量 − 收申请量。 | `calcRowAppliedTotal`：`payAmount - receiveAmount`。详见 `changelogs/change-log-2026-08-09-payment-application-pay-minus-receive.md`。 |
| 2026-07-30 | `Feature` | 列表「先付后票」可点击打开发票维护弹窗，对接 `EditInvoiceAsync` 补录发票/附件（不限 status）。 | 新增 `invoice-edit-modal` + `editPaymentApplicationInvoice`；附件全量覆盖须带回详情。详见 `changelogs/change-log-2026-07-30-payment-application-edit-invoice.md`。 |
| 2026-07-30 | `Feature` | 列表结算对象/币别改读对象化字段；部分结算/结算完毕点击状态弹窗展示关联结算明细与附件。 | DTO 增 `currency`/`paymentSettlements`，删旧字符串与平铺附件；`settlement-detail-modal` 消费列表行数据。详见 `changelogs/change-log-2026-07-30-payment-application-settlement-objectified.md`。 |
| 2026-07-12 | `Fix` | 「申请合计」改为可见锚点列，面板中可拖动/调宽/显隐并持久化，各币别跟随列自动跟随；修复取消勾选仍渲染、相邻「申请人」列无法调宽、拖动排序不生效。 | 锚点 `appliedTotal` 承载首个币别、`slots.header` 动态表头；`buildColumnsWithRuntime` 以 `grid.getFullColumns()` 运行时列为唯一数据源保留显隐/固定/宽/序；`visibleMethod` 隐藏跟随列；移除 `customChange` 中途重建。 |
| 2026-07-12 | `Fix` | （已被同日方案取代）列配置「申请合计」曾用 0 宽隐藏锚点代理列。 | 旧 `syncAppliedTotalColumns` 方案与 Vxe 布局/拖拽冲突，已重构为可见锚点列。 |
| 2026-07-12 | `Feature` | 列表按当前页币别动态生成「{币别}申请合计」列。 | `useColumns(rows)` + `watch(tableData)` 重建列；`calcRowAppliedTotal` 汇总 pay+receive。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application` 对应组件 `src/views/fee-management/payment-application/list.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
