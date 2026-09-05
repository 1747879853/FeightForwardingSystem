---
title: 银行流水编辑
module: 结算管理
author: Cursor Agent
last_updated: 2026-09-05
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水记录实际到账的收款信息，是财务执行收费核销的工作台。编辑页先展示流水金额、已核销、剩余可核销和关联核销单；流水尚未开始核销时可修改基础信息，核销开始后基础信息锁定；核销单的新建、查看和编辑统一在右侧抽屉完成。

# 2. 功能与操作说明 (Features & Operations)

- **新建银行流水：** 标题行维护操作人（Tag + Popover）；主体仅「流水信息」；保存成功后 `replace` 到编辑页并 `closeTabByKey` 关掉新建页签。
- **编辑银行流水：** 顶部左右分栏——左侧「流水基础信息」四列到账信息（含银行与摘要/留言/备注），右侧核销进度；两卡等高。标题区展示流水号、核销状态、付款方等摘要。
- **流水状态锁定：** 仅 `PendingWriteOff`（待核销）状态且具备 `Admin.BankStatement.Edit` 权限时允许修改流水信息和可核销操作人；部分核销、核销完成状态隐藏保存，基础信息改为纯文本只读（不渲染禁用输入框）。
- **关联收费核销（含发票结算）：** 列表展示核销单核心信息且不设操作列；双击行后，按 `type` 在抽屉打开费用核销或发票核销表单。
- **可核销操作人：** Tag 展示额外指定的核销人，Popover 内增删人员与备注；流水创建财务仍可核销，最终操作授权由后端校验。新建/更换付款方时，自动带出该客户在客户管理绑定的「操作」干系人（可再手工增删）；编辑回填已保存流水时不覆盖。
- **抽屉新增核销：** 从「关联核销单」区域的新建按钮打开宽抽屉，可切换按费用核销或按发票核销；创建成功关闭抽屉并刷新金额汇总与关联核销单。按费用选费检索为编号（委托编号/主提单号）、委托单位、开船日期、销售、操作、收付类型（默认应收）；业务行仍分列委托编号、主提单号，费用明细含收付类别。选费/选开票明细嵌套表使用 `NestedDataTable`（业务行表头可全选当前页费用明细、行勾选该票费用、组内全选、表头拖拽调列宽）。
- **抽屉编辑核销：** 复用收费核销独立表单的嵌入模式，支持保存、锁定、解锁、删除及明细维护；原独立路由继续保留。

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

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在详情 DTO 中]** `DetailAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需通过 `GetUserAsync` 补齐展示名。

> [!IMPORTANT] **[卡点 2：建单后剩余可结算需刷新]** 创建结算单成功后必须重新拉取流水详情与关联列表，否则底部「剩余可结算」校验可能使用旧值。

> [!IMPORTANT] **[卡点 3：创建人授权不能由前端可靠判断]** 详情 DTO 只有 `creatorUserName`，没有 `creatorUserId`；前端只能展示规则，不能以姓名比对拦截操作，创建人和指定核销人的权限必须由后端接口校验。

> [!IMPORTANT] **[卡点 4：新建保存后必须关闭原 Tab]** 新建与 `/edit/:id` 是不同 Tab key；仅 `replace` 仍会留下新建页签。须先缓存 `route.fullPath`，`await replace` 后再 `closeTabByKey`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-05 | `Fix` | 新建流水保存成功后 `replace` 进编辑并关闭新建页签。 | 详见 `changelogs/change-log-2026-09-05-create-tab-replace-close.md`。 |
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
