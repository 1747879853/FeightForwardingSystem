---
title: 付款申请列表
module: 费用管理
author: auto-doc-sync
last_updated: 2026-08-10
---

# 1. 业务背景说明 (Background)

**白话解释：** 付款申请列表用于查询、创建和进入付款申请单编辑，是应付费用付款流程入口。对已部分结算/结算完毕的申请，可点击状态查看关联付费结算明细与附件。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/payment-application` |
| 路由名称 | `PaymentApplicationList` |
| 页面组件 | `src/views/fee-management/payment-application/list.vue` |
| 权限口径 | Admin.PaymentApplication / Admin.PaymentApplication.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/payment-application/settlement-detail-modal.vue`<br/>`src/views/fee-management/payment-application/invoice-edit-modal.vue`<br/>`src/api/settlement-management/payment-application-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **申请单查询：** 按申请状态、客户/供应商、时间等条件查询付款申请。
- **创建申请：** 进入新增页选择可申请付款的费用。
- **编辑申请：** 双击行进入编辑页维护申请单明细。
- **申请合计列：** 列表按当前页数据动态展示各币别「{币别}申请合计」列（原币净额 = 付 − 收）；列配置面板仅保留「申请合计」一项（可见锚点列，承载首个币别），像普通列一样可拖动、调宽、显隐并持久化，其余币别作为跟随列自动跟随锚点的显隐与顺序。
- **结算明细弹窗：** 申请状态为「部分结算」「结算完毕」时，点击状态 Tag 弹出关联结算列表（单号/时间/结算对象/币别/金额/附件）；数据来自列表行 `paymentSettlements`，无需再请求详情。
- **补录发票弹窗：** 发票流程为「先付后票」时，点击「发票流程」打开维护弹窗（发票流程/发票号/开票日期/附件）；保存走 `EditInvoiceAsync`，不判断申请 status，适合审核通过后补录。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |
| 部分结算 / 结算完毕 | 用户点击状态 Tag | 打开结算明细弹窗 | 其它状态不可点开结算明细。 |
| 任意申请状态 | 用户点击「先付后票」 | 打开发票维护弹窗 | 仅发票流程=先付后票可点；保存不改变申请 status。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **申请状态** | 付款申请单当前处理阶段。 | `PaymentApplicationStatus` | **触发/依赖：** 部分结算/结算完毕可点击打开 `paymentSettlements` 弹窗。 | 状态流转以后端枚举为准。 |
| **结算对象** | 申请结算客户简称。 | `settlement.name`（`ClientSimpleDtoForOrder`） | **触发/依赖：** 列表展示；勿再读已删除的 `clientName`。 | 客户不存在时为空。 |
| **币别** | 申请结算币别代码。 | `currency.code`（`CurrencySimpleDto`） | **触发/依赖：** 原币申请（无 `currencyId`）展示「原币」。 | 只读。 |
| **关联结算** | 本申请关联的付费结算简要。 | `paymentSettlements[]` | **触发/依赖：** 含结算附件 `attachments`；`totalSettledPrice` 为整单金额。 | 无关联时为空数组。 |
| **发票流程** | 先票后付 / 先付后票 / 不开票。 | `invoiceProcess`（0/1/2） | **触发/依赖：** 值为 1（先付后票）时可点击打开发票维护弹窗。 | 补录保存走 `EditInvoiceAsync`。 |
| **发票号 / 开票日期** | 发票信息；先付后票可后续补录。 | `invoiceNo` / `invoiceDate` | **触发/依赖：** 弹窗内可改；不开票时清空。 | 发票号最长 128。 |
| **{币别}申请合计** | 列表按币别展示的申请净额（原币，付 − 收）。 | `currencyGroup[].payAmount - receiveAmount` | **触发/依赖：** 当前页数据变化时动态生成列。 | 只读展示。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：付款申请列表一致性]** 付款申请需保证费用选择、申请金额和审核状态一致，避免重复申请或超额申请。

> [!IMPORTANT] **[卡点 2：出参对象化破坏性变更]** 勿再兼容 `clientName` / `currencyCode` / `paymentSettlementAttachments`；结算附件仅在 `paymentSettlements[].attachments`，与申请自身 `attachmentGroup` 模块不同。

> [!IMPORTANT] **[卡点 3：EditInvoice 附件全量覆盖]** 保存发票信息时须带回详情当前 `attachmentGroup`，否则附件会被清空；勿与仅录入/驳回可用的 `EditAsync` 混用预期。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-10 | `Refactor` | 外联平铺字段改读 SimpleDto：选费港口/字典、详情明细费用名、任务列表结算与币别。 | 港口读对象；明细 `orderFee.feeCode/currency/settlement`；任务 `settlement.name` / `currency.code`。详见 `changelogs/change-log-2026-08-10-foreign-key-simple-dto-alignment.md`。 |
| 2026-08-09 | `Fix` | 「{币别}申请合计」改为付申请量 − 收申请量。 | `calcRowAppliedTotal`：`payAmount - receiveAmount`。详见 `changelogs/change-log-2026-08-09-payment-application-pay-minus-receive.md`。 |
| 2026-07-30 | `Feature` | 列表「先付后票」可点击打开发票维护弹窗，对接 `EditInvoiceAsync` 补录发票/附件（不限 status）。 | 新增 `invoice-edit-modal` + `editPaymentApplicationInvoice`；附件全量覆盖须带回详情。详见 `changelogs/change-log-2026-07-30-payment-application-edit-invoice.md`。 |
| 2026-07-30 | `Feature` | 列表结算对象/币别改读对象化字段；部分结算/结算完毕点击状态弹窗展示关联结算明细与附件。 | DTO 增 `currency`/`paymentSettlements`，删旧字符串与平铺附件；`settlement-detail-modal` 消费列表行数据。详见 `changelogs/change-log-2026-07-30-payment-application-settlement-objectified.md`。 |
| 2026-07-12 | `Fix` | 「申请合计」改为可见锚点列，面板中可拖动/调宽/显隐并持久化，各币别跟随列自动跟随；修复取消勾选仍渲染、相邻「申请人」列无法调宽、拖动排序不生效。 | 锚点 `appliedTotal` 承载首个币别、`slots.header` 动态表头；`buildColumnsWithRuntime` 以 `grid.getFullColumns()` 运行时列为唯一数据源保留显隐/固定/宽/序；`visibleMethod` 隐藏跟随列；移除 `customChange` 中途重建。 |
| 2026-07-12 | `Fix` | （已被同日方案取代）列配置「申请合计」曾用 0 宽隐藏锚点代理列。 | 旧 `syncAppliedTotalColumns` 方案与 Vxe 布局/拖拽冲突，已重构为可见锚点列。 |
| 2026-07-12 | `Feature` | 列表按当前页币别动态生成「{币别}申请合计」列。 | `useColumns(rows)` + `watch(tableData)` 重建列；`calcRowAppliedTotal` 汇总 pay+receive。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/payment-application` 对应组件 `src/views/fee-management/payment-application/list.vue`，权限口径为 Admin.PaymentApplication / Admin.PaymentApplication.Get。 |
