---
title: 银行流水编辑
module: 结算管理
author: Cursor Agent
last_updated: 2026-10-02
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水记录实际到账的收款信息，是财务执行收费核销的工作台。编辑页先展示流水金额、已核销、剩余可核销和关联核销单；流水尚未开始核销时可修改基础信息，核销开始后基础信息锁定；核销单的新建、查看和编辑统一在右侧抽屉完成。

# 2. 功能与操作说明 (Features & Operations)

- **新建银行流水：** 标题行维护操作人（Tag + Popover）；主体仅「流水信息」；保存成功后 `replace` 到编辑页并 `closeTabByKey` 关掉新建页签。
- **编辑银行流水：** 顶部左右分栏——左侧「流水基础信息」四列到账信息（含银行与摘要/留言/备注），右侧核销进度；两卡等高。进度条紧贴金额指标下方，百分比与进度条同一行、位于条的右侧。标题区展示流水号、核销状态、付款方等摘要。页面只认打开时的流水 ID，切到其他单据不会把本页重载成对方的流水。
- **流水状态锁定：** 待核销且具备 `Admin.BankStatement.Edit` 时，可改流水基础信息和可核销操作人。详情 `receiveSettlements` 不为空时，币别、付款方改为带锁图标的纯文本，悬停、聚焦或点击才提示「已有收费结算，要改请先删除收费结算」，字段下方不再常驻灰色说明；不要用核销状态判断这两项，已结算金额为 0 时也可能还挂着收费结算。有编辑权限时，部分核销、核销完成仍可改流水金额，其余基础信息保持只读。
- **关联收费核销（含发票结算）：** 列表展示核销单核心信息且不设操作列。本次结算、原始结算金额、差值三列右对齐，并用等宽数字便于上下对位；差值为 0 时灰色弱化，非 0 用橙色加粗。双击行后，按 `type` 在抽屉打开费用核销或发票核销表单。费用结算展开费用明细（原币结算额、汇率、折合流水币）；发票结算展开「发票开出 → 费用」，组头含开出单号、发票号、开票时间、币别和本组原始结算金额，费用行含开票金额、结算金额、汇率和原始结算金额，缺汇率显示「-」并提示。展开数据来自流水详情 `receiveSettlements`，没有对应明细时不显示展开按钮。
- **可核销操作人：** Tag 展示额外指定的核销人，Popover 内增删人员与备注；流水创建财务仍可核销，最终操作授权由后端校验。新建/更换付款方时，自动带出该客户在客户管理绑定的「操作」干系人（可再手工增删）；编辑回填已保存流水时不覆盖。
- **抽屉新增核销：** 从「关联核销单」区域的新建按钮打开宽抽屉，可切换按费用核销或按发票核销；创建成功关闭抽屉并刷新金额汇总与关联核销单。抽屉顶上一行展示流水号、付款方、总额、已核和剩余可用。按费用选费检索压成两行，查询和重置在右下角。检索下方可录入本次结算金额做「按金额自动核销」：只结与本流水同币别、同一付款方的费用，客户对账单号沿用上方「客户对账」，由后端按净额小的业务先整票结清、最后一票先付后收来拆分，不折币；金额须大于 0 且不超过剩余可用流水。已勾选费用或填写了自动接口不认的检索时会先确认。业务父行仍分列委托编号、主提单号、订舱号、客户、开船日期、船公司、起运港、目的港、箱型箱量和费用数，并在末列按币别显示待核应收/应付。费用子表用浅灰底并缩进，避免和父行复选框叠在一起。行内填写结算汇率（默认当天该币别兑流水币的应收/应付汇率，同币别固定为 1）和以流水币计价的本次结算；下方小字折回原币。勾选时按剩余流水自动铺满，也可「填入剩余流水」或在流水够用时「全额结清」。底栏只读汇总本次核销、折合原币和流水结余；超出剩余可用时结余标红并禁用确认。提交时明细 `settledAmount` 仍是费用原币，`actualSettled` 是各行流水币金额的净额。按发票选票为「发票开出 → 费用」，新建仍单独填写本次结算。选费嵌套表使用 `NestedDataTable`（业务行表头可全选当前页，行勾选该票费用，表头可拖拽调列宽）。关联核销单金额列改读本次结算，并展示原始结算金额、差值。
- **抽屉编辑核销：** 复用收费核销独立表单的嵌入模式，支持保存、锁定、解锁、删除及明细维护；原独立路由继续保留。发票结算编辑按发票开出分组展示费用，删除传发票开出和费用。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 新建 | 保存成功 | 编辑 | 创建后 `replace` 到 `/bank-statement/edit/:id` 并关闭新建页签。 |
| 编辑 | 保存成功 | 编辑 | 停留当前页，列表标记需刷新。 |
| 待核销 | 保存流水 | 待核销 | 更新流水基础信息，停留当前页。 |
| 待核销/部分核销 | 抽屉创建核销单 | 部分核销/核销完成 | 停留当前页，刷新已核销、剩余金额和关联核销单。 |
| 部分核销/核销完成 | 查看流水 | 状态不变 | 流水基础信息锁定，仅处理关联核销单。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **可核销操作人** | 指定除流水创建人外可执行核销的人员。 | **银行流水**<br/>`DetailAsync`、`EditAsync`<br/>**用户**<br/>`GetUserAsync`<br/>**客户干系人**<br/>`GetDishonestStakeholdersAsync.operations` | 按 `operationId` 异步解析昵称；用户选择/更换付款方时按客户绑定「操作」默认填充（可再改）；详情回填不覆盖。 | 仅待核销状态可维护；最终授权由后端校验。 |
| **核销状态** | 流水与收费结算金额匹配程度。 | **银行流水**<br/>`DetailAsync.writeOffStatus` | 编辑页流水号旁 Tag 只读展示。 | 只读。 |
| **付款方** | 流水对应的结算对象（客户）。 | **银行流水**<br/>`DetailAsync` → `settlement`（`id`/`name`/`fullName`/`address`） | 变更付款方时清空对方银行，并默认带出客户绑定操作人；编辑回显用详情 `settlement` 构造 `ClientSelect` 的 `selected-items`。 | 必填；对象可能为 `null`，展示需兜底。 |
| **关联收费结算** | 基于本流水创建的收费核销单。 | **银行流水**<br/>`GetReceiveSettlementPagedListAsync` | 双击按 `type` 打开对应编辑抽屉；抽屉内保存、增删明细、锁定、解锁或删除后刷新外层汇总与列表。 | 主界面只读。 |
| **剩余可核销** | 流水金额减已核销净额。 | **银行流水详情 + 关联核销列表** | 核销抽屉发生变更后重新加载。 | 新建核销合计不能超过剩余可核销金额。 |
| **按费用本次结算** | 这一行实际占用的流水金额，单位是流水币。 | 行内录入；汇率默认 `ExchangeRateAdmin` 当天生效的应收 `drValue` / 应付 `crValue`（费用币兑流水币） | 勾选后取「费用剩余 × 汇率」和「尚未占用的流水」中较小值。改汇率会重算折合，并卡住不超过费用剩余。 | 折回原币后不能超过费用剩余额度。同一原币共用一个汇率。超出流水剩余时不能确认。 |
| **按金额自动核销** | 不勾费用，只录本次结算金额，由后端自动拆到同币别费用上。 | **收费结算**<br/>`AddByAutoAllocationAsync` | 对账单号取上方「客户对账」；币别、付款方取银行流水。成功后关闭抽屉并刷新。 | 金额 > 0 且不超过剩余可用流水；权限同新建核销。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在详情 DTO 中]** `DetailAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需通过 `GetUserAsync` 补齐展示名。

> [!IMPORTANT] **[卡点 2：建单后剩余可结算需刷新]** 创建结算单成功后必须重新拉取流水详情与关联列表，否则底部「剩余可结算」校验可能使用旧值。

> [!IMPORTANT] **[卡点 3：创建人授权不能由前端可靠判断]** 详情 DTO 只有 `creatorUserName`，没有 `creatorUserId`；前端只能展示规则，不能以姓名比对拦截操作，创建人和指定核销人的权限必须由后端接口校验。

> [!IMPORTANT] **[卡点 4：新建保存后必须关闭原 Tab]** 新建与 `/edit/:id` 是不同 Tab key；仅 `replace` 仍会留下新建页签。须先缓存 `route.fullPath`，`await replace` 后再 `closeTabByKey`。

> [!IMPORTANT] **[卡点 5：按费用核销的金额口径]** 界面按流水币录入本次结算，提交给 `AddAsync` 时明细 `settledAmount` 必须折回费用原币，`actualSettled` 才是流水币净额。汇率按原币各存一行，同一张单里同一原币不能各行各用一个汇率。后端不拿「原币 × 汇率」和 `actualSettled` 做相等校验，分位四舍五入可能留下几分钱差值。

> [!IMPORTANT] **[卡点 6：按金额自动核销只认同币别与对账单号]** `AddByAutoAllocationAsync` 固定费用币别 = 流水币别、结算对象 = 付款方，只额外接收委托编号/主提单号/对账单号。当前抽屉只把「客户对账」传给该接口；编号、委托单位等其它检索不会参与自动分配。分配在后端完成（净额小的业务先整票结清），前端不预览明细。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-10-02 | `Feature` | 按费用核销支持录入本次结算金额自动拆分核销：只结同币别费用，对账单号沿用检索区，成功后关闭抽屉并刷新。 | TAPD #1000161；对接 `AddByAutoAllocationAsync`。金额校验与忽略条件整理落在 `fee-write-off.ts`。详见 [变更记录](../../changelogs/change-log-2026-10-02-银行流水按金额自动核销.md)。 |
| 2026-10-01 | `Feature` | 关联核销里按发票展开的组头补上开票时间和币别，费用行补上开票金额和汇率。缺汇率显示「-」并提示。 | 展开仍读流水详情 `receiveSettlements.invoiceIssues`。TAPD #1000178。详见[变更记录](../../changelogs/change-log-2026-10-01-银行流水发票开出展开补字段.md)。 |
| 2026-09-30 | `Refactor` | 核销进度百分比与进度条同一行，去掉进度条下方的核销构成。 | 进度组件外层默认 `width: 100%`，百分比会掉到下一行，改为横排并取消外层占满。详见 [变更记录](../../changelogs/change-log-2026-09-30-核销进度百分比同一行.md)。 |
| 2026-09-30 | `Refactor` | 关联核销单的本次结算、原始结算金额、差值右对齐；差值为 0 时灰色，非 0 橙色加粗。 | 列 `align` 原本已是右对齐，单元格补等宽数字。差值来自列表 `diffAmount`。详见 [变更记录](../../changelogs/change-log-2026-09-30-关联核销单金额列对齐与差值高亮.md)。 |
| 2026-09-30 | `Refactor` | 核销进度百分比改到进度条右侧，剩余可核销只改数字颜色；空余区展示核销构成和快捷核销。有收费结算时，付款方、币别的锁定说明改为悬停或点击提示。 | 构成按详情 `receiveSettlements` 的 `type` 与 `actualSettled` 汇总。详见 [变更记录](../../changelogs/change-log-2026-09-30-银行流水核销进度卡片收紧.md)。 |
| 2026-09-30 | `Fix` | 费用结算展开显示费用明细，不再提示「暂无发票开出明细」。 | 展开数据仍取详情 `receiveSettlements`。发票结算才走 `invoiceIssues`。 |
| 2026-09-30 | `Refactor` | 按费用核销把汇率和流水币金额放进费用行，底栏改为只读汇总；业务父行保持原列，末列增加待核金额。 | 提交仍是原币 `settledAmount` 加流水币 `actualSettled`。同一原币只能有一个汇率。详见 [变更记录](../../changelogs/change-log-2026-09-30-银行流水按费用核销行内汇率.md)。 |
| 2026-09-29 | `Fix` | 按费用建单的业务列表增加开船日期、船公司、起运港、目的港、箱型箱量。整票勾选保持原样。 | 列与收费核销添加明细共用。详见 [变更记录](../../changelogs/change-log-2026-09-29-收费核销选费补业务列和整票勾选.md)。 |
| 2026-09-28 | `Feature` | 按发票核销选票改为「发票开出 → 费用」；新建提交发票开出加费用与本次结算。 | 与收费核销共用抽屉列定义。详见 [变更记录](../../changelogs/change-log-2026-09-28-发票结算选票改为发票开出.md)。 |
| 2026-09-28 | `Feature` | 关联核销单按发票行可展开「发票开出 → 费用」；按发票新建必填并提交本次结算。 | 展开数据取详情 `receiveSettlements`，不取列表分页的 `invoiceIssues`。详见 [变更记录](../../changelogs/change-log-2026-09-28-银行流水关联核销按发票展开与本次结算.md)。 |
| 2026-09-28 | `Feature` | 抽屉里的发票结算编辑按发票开出分组，删除改为发票开出加费用。 | 流水详情里的收费结算改读 `invoiceIssues`。详见 [变更记录](../../changelogs/change-log-2026-09-28-发票结算详情按发票开出分组.md)。 |
| 2026-09-27 | `Feature` | 按费用核销可选其他币别，确认时填写本次结算和汇率。有收费结算时币别、付款方不可改，流水金额在部分核销后仍可改。关联核销单改看本次结算、原始结算金额、差值。 | 已结算金额用详情 `settledAmount`，不再把列表 `totalSettledAmount` 相加。详见 [变更记录](../../changelogs/change-log-2026-09-27-银行流水按费用核销跨币别.md)。 |
| 2026-09-24 | `Fix` | 编辑页切到其他单据时，不再按对方 ID 重载本条流水。 | 流水 ID 在实例创建时记下，去掉对全局 `params.id` 的监听。新建保存仍 `replace` 出新编辑实例。详见 [变更日志](../../changelogs/change-log-2026-09-24-编辑页固定本页业务ID.md)。 |
| 2026-09-20 | `Feature` | 按费用核销选费增加「客户对账」检索，按对账单号缩小费用。 | TAPD #0150；`statementNum` 对接 `GetOrderFeeGroupAsync`。详见[变更记录](../../changelogs/change-log-2026-09-20-银行流水按费用核销对账单检索.md)。 |
| 2026-09-08 | `Fix` | 按开票申请建单的申请时间筛选改为自然日闭区间。 | 详见 `changelogs/change-log-2026-09-08-date-range-start-end-of-day.md`。 |
| 2026-08-31 | `Fix` | 按费用核销业务行增加勾选：表头全选当前页费用明细，行勾选该票全部费用；展开后组内全选仍可用。 | TAPD 1000914；勾选列只加在面板本地 `feeOrderColumns`，不改共享 `orderColumns`。详见 `changelogs/change-log-2026-08-31-bank-statement-fee-select-all.md`。 |
| 2026-08-19 | `Feature` | 按费用新建核销选费区：编号合并检索，补委托单位/开船日期/销售/操作/收付类型（默认应收）；费用明细展示收付类别。业务行仍分列委托编号、主提单号。 | 检索 schema 与 `GetOrderFeeGroupAsync` 参数仍落在收费核销 `add-fee-drawer/data`，`create-settlement-fee-panel` 只隐藏结算对象/币别。详见 `changelogs/change-log-2026-08-19-receive-settlement-fee-drawer-filters.md`。 |
| 2026-08-11 | `Refactor` | 编辑页顶部左右分栏（左流水基础信息、右核销进度，等高）；基础信息 4 列「到账信息」，补充字段并入；锁定后纯文本只读。 | `form.vue`：`top-panels--split` + 卡片 `height:100%`；`canEditStatement` 为假时渲染 `form-text`。详见 `changelogs/change-log-2026-08-11-bank-statement-edit-split-layout.md`。 |
| 2026-08-11 | `Refactor` | 新建核销抽屉内选费/选开票嵌套表改用 `NestedDataTable`，支持组内全选。 | `create-settlement-fee-panel` / `create-settlement-invoice-panel`；费用列配置落在 `add-fee-drawer/data`（`feeItemColumns` + `orderFees`）。详见 `changelogs/change-log-2026-08-11-create-settlement-nested-table.md`。 |
| 2026-08-10 | `Fix` | 新建核销入口与抽屉标题文案由「按开票申请核销 / 按开票申请」统一为「按发票核销 / 按发票」。 | 仅改 `receive-settlement-panel`、`settlement-workbench-drawer` 展示文案；`type=1` 与选开票申请数据源不变。详见 `changelogs/change-log-2026-08-10-bank-statement-invoice-writeoff-label.md`。 |
| 2026-08-10 | `Fix` | 选择/更换付款方后，可核销操作人默认带出客户管理绑定的「操作」干系人；编辑回填不覆盖已保存操作人。 | `GetDishonestStakeholdersAsync` + `buildOperatorRowsFromClientOperations`；`pageLoading` 与序号防串。详见 `changelogs/change-log-2026-08-10-bank-statement-default-operators-from-client.md`。 |
| 2026-08-09 | `Refactor` | 关联收费核销明细展开时，嵌套 `orderFee` 的费用名称/币别/结算对象改读对象路径。 | `bank-statement/utils.ts` 的 `mapReceiveSettlementDetailItem` / `mapReceiveSettlementInvoiceDetailItem` 改读 `orderFee?.feeCode?.cnName` 等；选费面板仍用 `ReceiveSettlementFeeDto`/`InvoiceAppSettleItemDto` 平铺。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-07-25 | `Refactor` | 付款方改读结算对象对象化后的 `settlement`；编辑进入时下拉直接回显付款方，不再依赖分页命中。 | 详情 `settlementName` 已删除，`applySavedBankStatementSnapshot` 与顶部摘要统一取 `detail.settlement?.name`；`ClientSelect` 补 `selected-items`（通用 Client 接口无 Detail，回显必须外部传入）。 |
| 2026-07-19 | `Fix` | 金额输入移除遮挡数字的步进箭头；补充信息增加明确的折叠提示；可核销操作人统一显示昵称；移除顶部重复的新建核销入口和关联列表操作列，改为双击行进入抽屉；抽屉修改结算后同步刷新外层数据；开票申请选择区默认仅查询可结算数据，并将查询、重置按钮与条件同行排列。 | 新建核销统一从关联核销单区域进入；操作人名称通过 `GetUserAsync` 解析并缓存昵称；嵌入式结算表单的保存、增删明细、锁定、解锁和删除统一向工作台发送变更事件；开票申请查询固定传 `onlySettleable: true`。 |
| 2026-07-16 | `Feature` | 页面改为财务核销工作台：增加流水/已核销/剩余汇总；仅待核销可编辑流水；新增和编辑核销统一迁入抽屉；关联区收敛为核销单核心列表；操作人明确为可核销操作人。 | 收费核销与发票结算表单增加 `embeddedId`/`embedded` 复用模式；详情缺创建人 ID，创建财务的核销授权需后端最终校验。 |
| 2026-07-14 | `Feature` | 关联收费核销支持展示/进入发票结算（type 列、按类型双击跳转、展开区按类型渲染明细、删除分流）；底部新增 `Segmented` 切换，可按开票申请创建发票结算。 | `bank-statement-admin.ReceiveSettlementListDto` 补 `type`；新增 `create-settlement-invoice-panel.vue`（复用 `add-invoice-application-drawer/data`）；`form-data` 增类型/收付 helper 与开票明细只读列；`utils` 增 `mapReceiveSettlementInvoiceDetailItem`；净额用 `toNetAmount` 计算。 |
| 2026-07-06 | `Refactor` | 底部选费建单移除结算时间与备注输入，选费后直接点击「创建结算单」完成建单。 | 接口仍传 `settlementTime`（前端取 `dayjs().toISOString()`），`remark` 省略。 |
| 2026-07-05 | `Feature` | 编辑页改版：标题行操作人、左流水/右关联结算（可展开明细）、底部选费一键建单；结算状态与核销状态 Tag 中文展示。 | 拆分为 `operator-title-bar`、`receive-settlement-panel`、`create-settlement-fee-panel` 三个子组件；选费逻辑复用收费结算 `add-fee-drawer/data`。 |
| 2026-06-20 | `Fix` | 修复编辑页操作人 UserSelect 回显数字 ID 问题。 | `buildOperatorRows` 调用 `GetUserAsync` 补齐名称。 |
