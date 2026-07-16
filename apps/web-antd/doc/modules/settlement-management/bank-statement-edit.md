---
title: 银行流水编辑
module: 结算管理
author: Cursor Agent
last_updated: 2026-07-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水记录实际到账的收款信息，是财务执行收费核销的工作台。编辑页先展示流水金额、已核销、剩余可核销和关联核销单；流水尚未开始核销时可修改基础信息，核销开始后基础信息锁定；核销单的新建、查看和编辑统一在右侧抽屉完成。

# 2. 功能与操作说明 (Features & Operations)

- **新建银行流水：** 标题行维护操作人（Tag + Popover）；主体仅「流水信息」；保存成功后 `replace` 到编辑页。
- **编辑银行流水：** 顶部展示流水号、核销状态、创建人、付款方，以及流水金额、已核销和剩余可核销；左侧维护流水信息，右侧只展示关联核销单。
- **流水状态锁定：** 仅 `PendingWriteOff`（待核销）状态且具备 `Admin.BankStatement.Edit` 权限时允许修改流水信息和可核销操作人；部分核销、核销完成状态隐藏保存并禁用字段。
- **关联收费核销（含发票结算）：** 列表展示核销单核心信息；点击「查看 / 编辑」或双击行后，按 `type` 在抽屉打开费用核销或发票核销表单。
- **可核销操作人：** Tag 展示额外指定的核销人，Popover 内增删人员与备注；流水创建财务仍可核销，最终操作授权由后端校验。
- **抽屉新增核销：** 顶部按钮打开宽抽屉，可切换按费用或按开票申请核销；创建成功关闭抽屉并刷新金额汇总与关联核销单。
- **抽屉编辑核销：** 复用收费核销独立表单的嵌入模式，支持保存、锁定、解锁、删除及明细维护；原独立路由继续保留。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 新建 | 保存成功 | 编辑 | 创建后跳转 `/bank-statement/edit/:id` 继续维护。 |
| 编辑 | 保存成功 | 编辑 | 停留当前页，列表标记需刷新。 |
| 待核销 | 保存流水 | 待核销 | 更新流水基础信息，停留当前页。 |
| 待核销/部分核销 | 抽屉创建核销单 | 部分核销/核销完成 | 停留当前页，刷新已核销、剩余金额和关联核销单。 |
| 部分核销/核销完成 | 查看流水 | 状态不变 | 流水基础信息锁定，仅处理关联核销单。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **可核销操作人** | 指定除流水创建人外可执行核销的人员。 | **银行流水**<br/>`DetailAsync`、`EditAsync`<br/>**用户**<br/>`GetUserAsync` | 详情缺 `operationName` 时按 `operationId` 异步补齐。 | 仅待核销状态可维护；最终授权由后端校验。 |
| **核销状态** | 流水与收费结算金额匹配程度。 | **银行流水**<br/>`DetailAsync.writeOffStatus` | 编辑页流水号旁 Tag 只读展示。 | 只读。 |
| **付款方** | 流水对应的结算对象（客户）。 | **银行流水**<br/>`DetailAsync` | 变更付款方时清空对方银行。 | 必填。 |
| **关联收费结算** | 基于本流水创建的收费核销单。 | **银行流水**<br/>`GetReceiveSettlementPagedListAsync` | 点击或双击按 `type` 打开对应编辑抽屉。 | 主界面只读。 |
| **剩余可核销** | 流水金额减已核销净额。 | **银行流水详情 + 关联核销列表** | 核销抽屉发生变更后重新加载。 | 新建核销合计不能超过剩余可核销金额。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在详情 DTO 中]** `DetailAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需通过 `GetUserAsync` 补齐展示名。

> [!IMPORTANT] **[卡点 2：建单后剩余可结算需刷新]** 创建结算单成功后必须重新拉取流水详情与关联列表，否则底部「剩余可结算」校验可能使用旧值。

> [!IMPORTANT] **[卡点 3：创建人授权不能由前端可靠判断]** 详情 DTO 只有 `creatorUserName`，没有 `creatorUserId`；前端只能展示规则，不能以姓名比对拦截操作，创建人和指定核销人的权限必须由后端接口校验。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-16 | `Feature` | 页面改为财务核销工作台：增加流水/已核销/剩余汇总；仅待核销可编辑流水；新增和编辑核销统一迁入抽屉；关联区收敛为核销单核心列表；操作人明确为可核销操作人。 | 收费核销与发票结算表单增加 `embeddedId`/`embedded` 复用模式；详情缺创建人 ID，创建财务的核销授权需后端最终校验。 |
| 2026-07-14 | `Feature` | 关联收费核销支持展示/进入发票结算（type 列、按类型双击跳转、展开区按类型渲染明细、删除分流）；底部新增 `Segmented` 切换，可按开票申请创建发票结算。 | `bank-statement-admin.ReceiveSettlementListDto` 补 `type`；新增 `create-settlement-invoice-panel.vue`（复用 `add-invoice-application-drawer/data`）；`form-data` 增类型/收付 helper 与开票明细只读列；`utils` 增 `mapReceiveSettlementInvoiceDetailItem`；净额用 `toNetAmount` 计算。 |
| 2026-07-06 | `Refactor` | 底部选费建单移除结算时间与备注输入，选费后直接点击「创建结算单」完成建单。 | 接口仍传 `settlementTime`（前端取 `dayjs().toISOString()`），`remark` 省略。 |
| 2026-07-05 | `Feature` | 编辑页改版：标题行操作人、左流水/右关联结算（可展开明细）、底部选费一键建单；结算状态与核销状态 Tag 中文展示。 | 拆分为 `operator-title-bar`、`receive-settlement-panel`、`create-settlement-fee-panel` 三个子组件；选费逻辑复用收费结算 `add-fee-drawer/data`。 |
| 2026-06-20 | `Fix` | 修复编辑页操作人 UserSelect 回显数字 ID 问题。 | `buildOperatorRows` 调用 `GetUserAsync` 补齐名称。 |
