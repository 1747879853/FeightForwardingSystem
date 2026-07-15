---
title: 银行流水编辑
module: 结算管理
author: Cursor Agent
last_updated: 2026-07-14
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水记录实际到账的收款信息，是收费结算的前置主数据。编辑页维护流水金额、付款方、银行等字段；标题行配置「操作人」以控制非 Admin 端可见范围；右侧展示已关联收费结算并可展开查看明细；底部可直接选费创建收费结算单。

# 2. 功能与操作说明 (Features & Operations)

- **新建银行流水：** 标题行维护操作人（Tag + Popover）；主体仅「流水信息」；保存成功后 `replace` 到编辑页。
- **编辑银行流水：** 左 40% 流水信息（流水号旁展示核销状态 Tag）；右 60% 关联收费核销（含费用结算与发票结算两类，全列、搜索、分页、行展开只读明细、双击按类型跳转对应编辑页）；底部结算创建区可按方式切换建单（需 `Admin.ReceiveSettlement.Add`）。
- **关联收费核销（含发票结算）：** 展示该流水下所有结算，列含「结算类型」Tag；行展开按类型分别渲染费用明细或开票明细（后者带收付方向、开票申请单号、发票号）；双击 type=1 进 `/edit-by-invoice`，type=0 进 `/edit`；勾选明细删除按类型走 `DeleteInvoiceItemsAsync` 或 `DeleteItemsAsync`。
- **标题行操作人：** Tag 展示已选人，Popover 内增删行（UserSelect + 备注）；空表示非 Admin 端全员可见。
- **保存流水：** 顶部「保存」仅 `EditAsync` 银行流水；与底部「创建结算单」分离。
- **底部建单（费用/发票切换）：** 顶部 `Segmented` 切换「费用结算 / 发票结算」。费用结算按业务分组选费 `AddAsync`；发票结算按开票申请分组选开票明细 `AddByInvoiceApplicationAsync`（含「仅显示可结算」开关，按发票口径余额录入）。勾选后点击「创建结算单/创建发票结算」直接建单（结算时间取当前时间）；成功后停留本页并刷新关联列表与建单列表；剩余可结算按净额（收正付负）计算。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 新建 | 保存成功 | 编辑 | 创建后跳转 `/bank-statement/edit/:id` 继续维护。 |
| 编辑 | 保存成功 | 编辑 | 停留当前页，列表标记需刷新。 |
| 编辑 | 底部创建结算单成功 | 编辑 | 停留当前页，右侧关联列表与底部选费区刷新。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **操作人** | 控制该流水在非 Admin 端的可见操作人；空表示全员可见。 | **银行流水**<br/>`DetailAsync`、`EditAsync`<br/>**用户**<br/>`GetUserAsync` | 详情缺 `operationName` 时按 `operationId` 异步补齐。 | 保存时仅提交已选 `operationId` 的行。 |
| **核销状态** | 流水与收费结算金额匹配程度。 | **银行流水**<br/>`DetailAsync.writeOffStatus` | 编辑页流水号旁 Tag 只读展示。 | 只读。 |
| **付款方** | 流水对应的结算对象（客户）。 | **银行流水**<br/>`DetailAsync` | 变更付款方时清空对方银行。 | 必填。 |
| **关联收费结算** | 基于本流水创建的收费结算单。 | **银行流水**<br/>`GetReceiveSettlementPagedListAsync` | 行展开调 `ReceiveSettlementAdmin/DetailAsync` 拉只读明细；双击跳转编辑。 | 只读子表。 |
| **底部选费** | 可结算费用分组列表。 | **收费结算**<br/>`GetOrderFeeGroupAsync` | 传流水 `settlementId`、`currencyId`；创建调 `AddAsync`。 | 至少一条明细；合计不超过流水剩余可结算金额。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在详情 DTO 中]** `DetailAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需通过 `GetUserAsync` 补齐展示名。

> [!IMPORTANT] **[卡点 2：建单后剩余可结算需刷新]** 创建结算单成功后必须重新拉取流水详情与关联列表，否则底部「剩余可结算」校验可能使用旧值。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-14 | `Feature` | 关联收费核销支持展示/进入发票结算（type 列、按类型双击跳转、展开区按类型渲染明细、删除分流）；底部新增 `Segmented` 切换，可按开票申请创建发票结算。 | `bank-statement-admin.ReceiveSettlementListDto` 补 `type`；新增 `create-settlement-invoice-panel.vue`（复用 `add-invoice-application-drawer/data`）；`form-data` 增类型/收付 helper 与开票明细只读列；`utils` 增 `mapReceiveSettlementInvoiceDetailItem`；净额用 `toNetAmount` 计算。 |
| 2026-07-06 | `Refactor` | 底部选费建单移除结算时间与备注输入，选费后直接点击「创建结算单」完成建单。 | 接口仍传 `settlementTime`（前端取 `dayjs().toISOString()`），`remark` 省略。 |
| 2026-07-05 | `Feature` | 编辑页改版：标题行操作人、左流水/右关联结算（可展开明细）、底部选费一键建单；结算状态与核销状态 Tag 中文展示。 | 拆分为 `operator-title-bar`、`receive-settlement-panel`、`create-settlement-fee-panel` 三个子组件；选费逻辑复用收费结算 `add-fee-drawer/data`。 |
| 2026-06-20 | `Fix` | 修复编辑页操作人 UserSelect 回显数字 ID 问题。 | `buildOperatorRows` 调用 `GetUserAsync` 补齐名称。 |
