---
title: 付费申请审批
module: 审核审批
author: auto-doc-sync
last_updated: 2026-09-06
---

# 1. 业务背景说明 (Background)

**白话解释：** 财务或审批人集中处理付款申请审批任务。选中列表中的申请后，可在同页查看费用合计、附件与费用明细，再执行「通过」或「驳回」。菜单文案现为「付费申请审批」。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/payment-review` |
| 路由名称 | `PaymentReview` |
| 页面组件 | `src/views/audit-approval/payment-review/index.vue` |
| 详情布局组件 | `src/views/audit-approval/payment-review/detail-panel.vue` |
| 权限口径 | Admin.PaymentApplication.Audit / Admin.PaymentApplication.Audit.Get |
| 关键源码 | `src/views/audit-approval/payment-review/index.vue`<br/>`src/views/audit-approval/payment-review/detail-panel.vue`<br/>`src/views/audit-approval/payment-review/data.ts`<br/>`src/api/audit-approval/payment-review-admin.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/views/fee-management/payment-application/form-data.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **付款审核查询：** 按编号（主提单号/订舱编号/委托编号，`TrimInput`）、申请单号、结算对象、结算币别、提交/审核时间等条件查询审核任务列表。任务状态默认「审核中」，清空后可看全部。
- **主提单号 / 委托编号列：** 分别从本行 `payAppFeeBySeaExportGroup[].transportOrder.mblNum`、`commissionNum` 保序去重后逗号拼接；一组付费申请可跨多票，过长省略号。组内金额字段恒为 `null`，不要拿来展示。
- **申请合计列：** 列表按当前页 `currencyGroup` 动态展示「{币别}申请合计」（原币/固定币别分口径，与付款申请列表一致）；默认插在「结算对象」后；列配置仅暴露「申请合计」锚点。
- **选中查看详情：** 点击列表行，右侧展示该付款申请的费用合计与结算银行（只读），下方通铺费用明细分组表（只读，业务组默认收起，需手动展开看费用行；表格占满剩余高度内部滚动，最后一行费用可完整看到），附件区展示发票子表（票号/抬头/日期/金额/附件，有金额时显示总额）以及申请自身分组附件、结算附件；点击附件打开全站附件查看器（图片/PDF 弹窗预览，Office 用 vue-office 本地渲染）。
- **三栏拖动：** 列表与右侧合计/附件之间、上方面板与下方费用明细之间的间隙可拖动改宽高；比例写入 `localStorage`（`payment-review-layout-split`），刷新后保留。
- **费用合计展示：** 原币多币别时以紧凑列表展示（币别+金额一行，银行信息单行缩略，悬停看全量）；卡片底部另展示该结算对象「应收未结算」（按币别，橙色区，与本申请金额分开）；合计区按内容限高，避免挤占附件区。
- **通过：** 对勾选中的**待审**任务弹出备注框后批量通过（`payAppAudit` → `AuditAsync`，`success: true`）。
- **驳回：** 工具栏只留一个【驳回】。勾选「审核中」或「审核通过」可用；已驳回、部分通过不可驳。待审与整单已通过走 `AuditAsync(success: false)`；整单仍在审但本人节点已过走 `RejectAsync`（同一按钮内分流，页面不再露出「审核后驳回」）。

**页面布局：**

```
┌─────────────────────┬──────────────────┐
│  审核任务列表        │  费用合计         │
│      （中间竖条拖宽） │  附件信息         │
├─────────────────────┴──────────────────┤
│     费用明细（与上方之间的横条拖高）      │
└────────────────────────────────────────┘
```

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 审核中（待审） | 审核人点击「通过」 | 已通过/部分通过/仍审核中 | `AuditAsync(success:true)`；若还有下一步，整单可能暂不落终态 |
| 审核中（待审，本人节点未过） | 审核人点击「驳回」 | 已驳回 | `AuditAsync(success:false)`，当前审核人不通过 |
| 已通过 | 审核人点击「驳回」 | 已驳回 | `AuditAsync(success:false)`，后端走与 RejectAsync 同一套退回 |
| 审核中且本人节点已过 | 审核人点击「驳回」 | 已驳回 | 同一按钮内走 `RejectAsync`；若误打 `AuditAsync` 会报非当前审核人 |
| 任意 | 点击列表行 | 详情已加载 | 按 `paymentApplicationId` 拉取 `DetailAsync` |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **paymentApplicationId** | 付款申请主键，驱动详情加载。 | 列表 `PayAppTaskListAsync` | **触发/依赖：** 点击行 → `DetailAsync` | 无则详情区显示空态 |
| **主提单号** | 本申请涉及业务的主提单号，多票逗号拼接。 | 列表 `PayAppTaskListAsync` → `payAppFeeBySeaExportGroup[].transportOrder.mblNum` | **触发/依赖：** 空数组兜底 `?? []`；trim 后跳过空值并保序去重；`showOverflow`。 | 组内 `currencyGroup`/`totalPayPrice`/`totalReceivePrice` 恒为 null，金额用行根字段。 |
| **委托编号** | 本申请涉及业务的内部委托编号，多票逗号拼接。 | 列表 `PayAppTaskListAsync` → `payAppFeeBySeaExportGroup[].transportOrder.commissionNum` | **触发/依赖：** 与主提单号同一分组、同一拼接口径。 | 组内金额字段恒为 null。 |
| **编号（Keyword）** | 按主提单号 / 订舱编号 / 委托编号检索。 | 查询 schema `Keyword`（`TrimInput`） | **触发/依赖：** 输入即时 trim；label「编号」，placeholder「主提单号/订舱编号/委托编号」。 | 可清空 |
| **任务状态（TaskStatus）** | 整单审核任务状态。 | 查询 schema `TaskStatus`；枚举 `TaskStatus`（0 审核中 / 1 已驳回 / 2 已通过 / 3 部分通过） | **触发/依赖：** 默认 `Auditing`；重置回到默认；清空后查全部。 | 可清空 |
| **id（任务）** | 审核任务 ID，用于 Audit/Reject 接口。 | 列表 `PayAppTaskListAsync` | **触发/依赖：** 批量审核提交 | 无合法状态行时提示，不发请求 |
| **应收未结算** | 该行结算对象已审核通过的应收费用未结算合计（原币、按币别）。展示在右侧费用合计卡片底部，不进列表列。 | 列表 `PayAppTaskListAsync` → `settlementReceivableGroup[]`（随选中行传入详情面板） | **触发/依赖：** 点击列表行后回填；与本申请 `currencyGroup` 无关；空数组兜底 `?? []`。 | 已结清币别不出现；无欠款显示「无欠款」。不要当成「本申请可结算余额」。 |
| **{币别}申请合计** | 列表按币别展示的申请净额（付 − 收）。 | **原币：** `currencyGroup[].payAmount − receiveAmount`<br/>**固定币别：** 仅结算币别列 `totalPayPrice − totalReceivePrice` | **触发/依赖：** 当前页数据变化时动态生成列；模式由 `currencyId`（空/`0`=原币）判定。 | 固定币别其它币别列留空；两侧总额都空留空。 |
| **费用合计** | 各币别申请净额（付 − 收）与结算银行。 | 前端按明细 `appliedAmount`+`paySide` 汇总（复用 `form-data`） | 原币/指定币别两种展示模式 | 只读 |
| **附件** | 先展示发票子表（票号/抬头/日期/金额/单附件，有金额时显示总额），再按附件明细类型分组展示申请附件，另含结算附件。 | `DetailAsync` → `paymentApplicationInvoices[].attachment` / `attachmentGroup` / `paymentSettlements[].attachments` | 点击调用 `openAttachmentViewer`；无发票附件显示「无附件」；总额前端求和 | 只读 |
| **费用明细** | 按业务+结算对象分组的费用行。 | `DetailAsync` → `payAppFeeBySeaExportGroup` | 复用付费申请 `form-data` 分组逻辑与 `NestedDataTable`（`fill-height`，外层表头纵滚吸顶）；加载后 `expandedGroupKeys` 为空，默认不展开 | 只读 |
| **审核意见** | 通过或驳回备注。 | 审核弹窗输入 | 写入 `AuditAsync`；本人节点已过的驳回写入 `RejectAsync` | 建议驳回时填写 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：任务 ID 与申请 ID 不可混用]** 详情接口使用 `paymentApplicationId`；审核接口使用任务行 `id`，批量操作时勿传错字段。

> [!IMPORTANT] **[卡点 2：一个【驳回】按钮、两套接口]** 页面只露【驳回】。待审与整单已通过走 `AuditAsync(success:false)`（后端已把通过后再驳回并进该接口）。整单仍在审、本人节点已过必须走 `RejectAsync`，不能并进 `AuditAsync`。已驳回、部分通过不可驳。

> [!IMPORTANT] **[卡点 3：批量范围为勾选行且按状态过滤]** 工具栏操作只提交当前勾选且状态合法的任务 id，不是整页全量。

> [!IMPORTANT] **[卡点 4：申请合计分口径]** 列表不要用前端重算汇率；原币读 `currencyGroup` 原币量，固定币别读整单 `totalPayPrice/totalReceivePrice`，且只填本单结算币别列。

> [!IMPORTANT] **[卡点 5：应收未结算 ≠ 申请合计]** `settlementReceivableGroup` 是结算对象维度的应收欠款总览；`currencyGroup` 是本申请申请金额。两列分开展示，禁止拼到同一套动态币别列。

> [!IMPORTANT] **[卡点 6：业务分组与行根金额同名不同层]** 列表 `payAppFeeBySeaExportGroup` 只填 `transportOrder`。组内 `currencyGroup` / `totalPayPrice` / `totalReceivePrice` 恒为 `null`；金额仍读 `PayAppTaskItemDto` 根上的同名字段。主提单号取 `transportOrder.mblNum`，委托编号取 `transportOrder.commissionNum`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-06 | `Feature` | 审批附件区发票行增加销售方抬头、发票金额，有金额时显示总额。 | 总额前端求和，不走后端字段。详见 `changelogs/change-log-2026-09-06-payment-application-invoice-seller-amount.md`。 |
| 2026-09-05 | `Fix` | Office 附件改为 vue-office 本地预览，不再走微软在线嵌入。 | 详见 `changelogs/change-log-2026-09-05-office-preview-vue-office.md`。 |
| 2026-09-05 | `Feature` | 点击发票/申请/结算附件改为全站弹窗预览，不再新开浏览器窗口。 | `openAttachmentViewer`。详见 `changelogs/change-log-2026-09-05-global-attachment-viewer.md`。 |
| 2026-09-05 | `Feature` | 列表、右侧合计/附件、下方费用明细三块间隙可拖动改大小，刷新后记住。 | 分隔条交互对齐费用审核详情；尺寸存 `localStorage`。 |
| 2026-09-05 | `Fix` | 费用明细纵滚时外层列名留在顶部。 | `NestedDataTable` 外层 `th` sticky 到 `__scroll`。 |
| 2026-09-05 | `Fix` | 展开费用明细后最后一行费用不再被滚动条裁切。 | 去掉 Ant Table 固定 `scroll.y: 300`，改 `NestedDataTable` 占满剩余高度。 |
| 2026-09-05 | `Fix` | 费用明细业务组默认收起，不再加载后自动全部展开。 | `loadDetail` 不再把 `orderGroups` 的 key 写入 `expandedGroupKeys`。 |
| 2026-09-04 | `Feature` | 审批详情附件区展示发票子表：每张发票的票号、开票日期与独立附件。 | 详情改读 `paymentApplicationInvoices`，不再使用主表 `invoiceNo`/`invoiceDate`。详见 `changelogs/change-log-2026-09-04-payment-application-invoice-subtable.md`。 |
| 2026-08-31 | `Fix` | 工具栏「驳回」与「审核后驳回」合成一个【驳回】；审核中、审核通过可驳。 | TAPD 1000908；后端 `AuditAsync(false)` 已合并整单已通过。本人节点已过、整单还在审仍走 `RejectAsync`。详见 `changelogs/change-log-2026-08-31-payment-review-merge-reject.md`。 |
| 2026-08-31 | `Fix` | 列表「提单号」改为「主提单号」，并增加「委托编号」；多票逗号拼接，过长省略。 | TAPD 1000910（不含付费结算）；共用 `formatPayAppCommissionNums`。详见 `changelogs/change-log-2026-08-31-payment-app-review-mbl-commission.md`。 |
| 2026-08-31 | `Fix` | 列表任务状态默认「审核中」，首屏和重置只看待审；清空可看全部。 | TAPD 1000915；`defaultValue` 用 `TaskStatus.Auditing`（值为 0），请求层不可把 0 当空丢掉。`MyStatus` 不默认。详见 `changelogs/change-log-2026-08-31-payment-review-default-auditing.md`。 |
| 2026-08-28 | `Feature` | 审批列表新增「提单号」列：从 `payAppFeeBySeaExportGroup` 取各票 `mblNum`，逗号拼接。 | 对接 `PayAppTaskListAsync` 新增业务分组；组内金额恒为 null，勿与行根 `currencyGroup` 混用。详见 `changelogs/change-log-2026-08-28-payment-review-list-mbl-nums.md`。 |
| 2026-08-19 | `Feature` | 右侧费用合计卡片展示结算对象「应收未结算」（TAPD 1000609）；列表不单开此列。 | 数据仍来自任务列表 `settlementReceivableGroup`，随选中行传入 `detail-panel`；与 `currencyGroup` 申请合计分开展示。详见 `changelogs/change-log-2026-08-19-payment-review-settlement-receivable.md`。 |
| 2026-08-11 | `Feature` | 列表删除结算币别/应付总金额/应收总金额列；申请合计按原币与固定币别分口径，默认插在结算对象后。 | `calcRowAppliedTotal` + 动态锚点列；详见 `changelogs/change-log-2026-08-11-payment-review-list-applied-total-settlement.md`。 |
| 2026-08-09 | `Fix` | 工具栏改为「通过 / 驳回 / 审核后驳回」：前两者走 `AuditAsync`（`success` 区分），后者走 `RejectAsync`；按任务状态启用与过滤提交。 | 原先「驳回」误调 `RejectAsync`。详见 `changelogs/change-log-2026-08-09-payment-review-audit-reject-api-align.md`。 |
| 2026-08-09 | `Style` | 费用明细「结算金额」→「已核销金额」；`unRqstPaymentAmount` 展示「可申请金额」。 | 详见 `changelogs/change-log-2026-08-09-payment-application-amount-labels.md`。 |
| 2026-08-09 | `Style` | 侧边栏/页标题由「付费审批」改为「付费申请审批」。 | 详见同 changelog。 |
| 2026-08-09 | `Feature` | 费用明细删除「申请折币」，新增「申请金额折币」（本次申请金额 × 申请汇率）。 | 与付费申请共用 `calcAppliedAmountConverted`。详见 `changelogs/change-log-2026-08-09-payment-application-settlement-applied-converted.md`。 |
| 2026-08-09 | `Refactor` | 审批详情面板费用明细行改读费用嵌套对象。 | `detail-panel.vue` 的 `mapDetailToFeeRows` 改走 `fee?.feeCode?.cnName` / `currency?.cnName` / `settlement?.name`；费用审核详情 `expense-all/modules/detail.vue` 币别汇总同步。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-09 | `Fix` | 费用合计按付 − 收净额展示（与付费申请表单一致）。 | 复用 `payment-application/form-data` 的 `signedAppliedAmount` 汇总。详见 `changelogs/change-log-2026-08-09-payment-application-pay-minus-receive.md`。 |
| 2026-07-29 | `Fix` | 右侧费用合计改为紧凑列表；附件按类型分组回显；嵌套费用子表宽度 +100px。 | 见 `change-log-2026-07-29-payment-review-fee-summary-layout.md`。 |
| 2026-07-12 | `Fix` | 查询「单号」改为「编号」，placeholder 统一为「主提单号/订舱编号/委托编号」；改用 `TrimInput` 自动去空格。 | 见 `change-log-2026-07-12-workspace-keyword-trim-checkbox.md`。 |
| 2026-07-11 | `Refactor` | 侧边栏菜单文案由「付费审核」更名为「付费审批」，路由 path 与审核逻辑不变。 | `auditApproval.json` 中 `paymentReview.title` 更新；`audit-approval.ts` `order` 调整为 210。 |
| 2026-06-28 | `Feature` | 重构为主从布局：上左列表、上右费用合计+附件、下通铺费用明细；工具栏仅保留审核全部与批量驳回。 | 新增 `detail-panel.vue` 统一布局与详情加载；复用 `payment-application/form-data.ts` 保证合计/明细口径一致；`paymentApplicationId` 与任务 `id` 职责分离。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；权限口径为 Admin.PaymentApplication.Audit / Admin.PaymentApplication.Audit.Get。 |
