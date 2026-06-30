---
title: 收费结算
module: 结算管理
author: Cursor Agent
last_updated: 2026-06-29
---

# 1. 业务背景说明 (Background)

**白话解释：** 收费结算用于把银行流水与应收费用的实际收款动作关联起来。财务人员先确定一条银行流水，再选择该结算对象下仍有剩余额度的“收”类型费用，录入本次结算金额，形成收费结算单。单据可锁定，锁定后只能查看或解锁，不能继续改主表、增删明细或删除单据。

# 2. 功能与操作说明 (Features & Operations)

- **收费结算列表：** 进入 `/settlement-management/receive-settlement` 后可按结算单号、结算时间、创建人和银行流水筛选收费结算单；查询区一行六列，结算时间范围占两列，银行流水通过下拉选择并直接传 `bankStatementId`；双击行进入编辑页，锁定单据进入只读查看页。
- **银行流水 Tab：** 同一页面切换至「银行流水」Tab 时，展示与 `/bank-statement` 相同的列（含已结算金额、核销状态）及核销状态筛选；调用 `BankStatement/GetPagedListAsync`（按操作人权限过滤）；双击行快捷新建收费结算。
- **新建收费结算：** 可从收费结算列表新建，若查询区已选银行流水则自动带入；也可从银行流水编辑页的“关联收费结算”卡片快捷新建并自动带入 `bankStatementId`。选中流水后在「结算信息」上方展示「银行流水信息」Card，含流水基础字段与结算进度汇总。
- **添加结算明细：** 在表单内点击“添加明细”，右侧抽屉按银行流水关联的结算对象（只读）、**币别（只读，与流水一致）**、委托编号、主提单号拉取可结算费用，按业务分组展开后勾选费用并录入本次结算金额。明细表格通过勾选行 + 工具栏「删除」批量删除，不再使用操作列。
- **编辑收费结算：** 未锁定单据可修改结算时间和备注；新增明细即时调用 `AddItemsAsync`，删除明细即时调用 `DeleteItemsAsync`。
- **锁定与解锁：** 编辑页顶部提供锁定/解锁按钮；锁定后隐藏保存、删除、添加明细等编辑入口。
- **银行流水联动：** 银行流水编辑页展示关联收费结算子表，可搜索结算单号、快捷新建收费结算，也可双击行进入收费结算页。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 未锁定 | 财务点击“锁定” | 已锁定 | 调用 `LockAsync`，设置 `Locked = true` 和锁定时间，前端进入只读模式。 |
| 已锁定 | 财务点击“解锁” | 未锁定 | 调用 `UnLockAsync`，清空锁定时间，前端恢复可编辑模式。 |
| 任意 `status` | 后端返回 | 原样展示 | `status` 只以 Tag 展示，前端不提供审核或状态流转按钮。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **银行流水** | 收款实际到账的流水记录，是收费结算主表必填归属。 | **银行流水**<br/>收费结算：`BankStatement/GetPagedListAsync`、`DetailAsync`、`GetReceiveSettlementPagedListAsync`（按当前用户操作人权限过滤，含列表筛选下拉 `BankStatementSelect`） | 列表查询区通过 `BankStatementSelect` 筛选；新建表单 picker 选择；从银行流水页进入时通过 `bankStatementId` query 预填。选中后在表单上方 Card 展示流水基础信息与结算进度（已结算不含本单、剩余可结算、本单合计）。 | 新建必填；已有结算明细后不能更换。保存时本单合计不得超过流水剩余可结算金额。 |
| **结算时间** | 本次收费结算发生时间。 | **收费结算**<br/>`ReceiveSettlementAdmin/AddAsync`、`EditAsync` | 新建默认当前时间，可手动调整；编辑保存只提交该字段与备注。 | 必填；锁定后只读。 |
| **结算明细** | 本次结算关联的订单费用集合。 | **收费结算**<br/>`GetOrderFeeGroupAsync`、`AddItemsAsync`、`DeleteItemsAsync` | 选费抽屉按业务分组返回可结算费用，确认后追加到主表明细；结算对象与币别均随银行流水固定，抽屉内不可修改；查询传 `currencyId` 与流水一致。 | 新建不能为空；费用不可重复；本次结算金额必须大于 0 且不超过剩余额度。 |
| **剩余额度** | 费用可继续被收费结算占用的金额。 | **收费结算**<br/>`GetOrderFeeGroupAsync` | 抽屉默认将本次结算金额填为剩余额度。 | 前端限制不超过 `remainingAmount`，后端继续校验。 |
| **锁定状态** | 控制单据是否允许编辑和删除。 | **收费结算**<br/>`DetailAsync`、`LockAsync`、`UnLockAsync` | 已锁定进入只读页；解锁后恢复编辑。 | 锁定后不能保存、删除、增删明细。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：明细金额不能编辑]** 后端仅提供新增和删除明细接口，没有编辑单条明细金额接口。因此编辑态已保存的明细金额只展示，不允许直接改；需要调整时先删除明细，再重新添加费用。

> [!IMPORTANT] **[卡点 2：选费筛选字段有限]** 收费结算选费接口只支持结算对象、委托编号、主提单号。前端不要展示费用代码、ETD、组织等无效筛选，避免用户误以为后端支持。

> [!IMPORTANT] **[卡点 3：锁定不是不可查看]** 锁定单据仍可从列表或银行流水子表双击进入，只是页面进入只读模式。删除和编辑必须隐藏或拦截。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-29 | `Fix` | 收费结算页「收费结算」「银行流水」两个 Tab 列表分别声明持久化 `tableId`，避免列/搜索项/排序配置互相覆盖。 | `ReceiveSettlementList` 与 `BankStatementList`；银行流水 Tab 与 `/bank-statement` 共用 `BankStatementList` 键。 |
| 2026-06-29 | `Feature` | 收费结算页「银行流水」Tab 列表新增已结算金额、核销状态列及核销状态筛选，与 Admin 银行流水列表字段对齐。 | 复用 `views/bank-statement/data.ts` 列与表单配置；`bank-statement-grid.vue` 增加 `#writeOffStatus` 插槽。 |
| 2026-06-21 | `Style` | 添加明细抽屉搜索区改为一行五列，查询/确认按钮置于第 5 列。 | `wrapperClass: grid-cols-5`、`labelWidth: 64`，按钮通过 `expand-after` 插槽与筛选项同行。 |
| 2026-06-21 | `Feature` | 添加明细抽屉新增只读币别，查询 `GetOrderFeeGroupAsync` 传 `currencyId` 与银行流水一致。 | `currencyId` 由 `bankStatementDetail` 经 `handleOpenAddFee` 传入 drawer props，搜索表单 `CurrencySelect` 禁用编辑。 |
| 2026-06-21 | `Fix` | 收费结算列表 `BankStatementSelect` 下拉改用 `BankStatement` 权限过滤接口。 | 与 picker、表单摘要接口对齐；回显详情走 `getBankStatementDetailByPermission`。 |
| 2026-06-21 | `Fix` | 收费结算拉取银行流水下关联结算列表改用 `BankStatement/GetReceiveSettlementPagedListAsync`。 | `loadBankStatementSummary` 中已结算汇总走 `getBankStatementReceiveSettlementPagedListByPermission`；银行流水编辑页子表仍用 Admin 接口。 |
| 2026-06-21 | `Fix` | 收费结算拉取银行流水详情改用 `BankStatement/DetailAsync`，与 picker 权限过滤接口一致。 | `loadBankStatementSummary` 中详情走 `getBankStatementDetailByPermission`。 |
| 2026-06-21 | `Fix` | 新建收费结算「选择银行流水」弹窗改用 `BankStatement/GetPagedListAsync`，仅展示当前用户有操作权限或未配置操作人的流水。 | 新增 `getBankStatementPagedListByPermission`；picker 与 Admin 列表/下拉职责分离。 |
| 2026-06-14 | `Style` | 收费结算表单优化：流水汇总金额分色展示；结算单号新建/编辑均以文本展示；明细删除改为勾选行 + 工具栏删除；添加明细按钮改为小尺寸带图标。 | 明细区 `canManageItems` 统一控制勾选列与工具栏；编辑态批量删除走 `DeleteItemsAsync` 一次提交多个 `receiveSettlementItemIds`。 |
| 2026-06-14 | `Feature` | 收费结算表单新增「银行流水信息」Card，展示流水基础字段及已结算/剩余可结算/本单合计；剩余不足标红，保存超限拦截。 | `loadBankStatementSummary` 并行拉 `DetailAsync` 与 `GetReceiveSettlementPagedListAsync`；编辑态汇总排除当前 `editId`，本单合计由明细 `settledAmount` computed 实时汇总。 |
| 2026-06-14 | `Fix` | 修复添加明细抽屉与新建页结算明细表中「本次结算金额」无法输入的问题；抽屉内输入金额时自动勾选对应费用。 | 列配置中 `slots.customRender` 与 `#bodyCell` 冲突导致 InputNumber 未渲染，改为 `key` + `#bodyCell` 匹配。 |
| 2026-06-14 | `Fix` | 添加结算明细抽屉中结算对象改为只读展示，随所选银行流水自动带出，不可手动切换。 | `settlementId` 由主表 `bankStatementSettlementId` 传入 drawer props，查询接口不再从表单读取可编辑的结算对象字段。 |
| 2026-06-14 | `Refactor` | 收费结算列表将银行流水筛选移至查询表单，移除工具栏「选择银行流水」按钮；查询区改为一行六列布局，结算时间占两列，标签宽 64px。 | 列表筛选与接口 `bankStatementId` 参数对齐；`labelWidth` 需配置在 `formOptions.commonConfig` 才会生效。 |
| 2026-06-10 | `Feature` | 新增收费结算列表、新建/编辑/只读页、银行流水 picker、选费抽屉，并接入银行流水编辑页快捷新建与双击跳转。 | 收费结算沿用付费结算的页面级列表/表单形态，但明细侧不支持编辑，只能按 AddItems/DeleteItems 即时提交。 |
