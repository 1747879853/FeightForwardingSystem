---
title: 银行流水编辑
module: 结算管理
author: Cursor Agent
last_updated: 2026-07-05
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水记录实际到账的收款信息，是收费结算的前置主数据。编辑页维护流水金额、付款方、银行等字段；标题行配置「操作人」以控制非 Admin 端可见范围；右侧展示已关联收费结算并可展开查看明细；底部可直接选费创建收费结算单。

# 2. 功能与操作说明 (Features & Operations)

- **新建银行流水：** 标题行维护操作人（Tag + Popover）；主体仅「流水信息」；保存成功后 `replace` 到编辑页。
- **编辑银行流水：** 左 40% 流水信息（流水号旁展示核销状态 Tag）；右 60% 关联收费结算（全列、搜索、分页、行展开只读明细、双击跳转收费结算编辑）；底部选费区可创建结算单（需 `Admin.ReceiveSettlement.Add`）。
- **标题行操作人：** Tag 展示已选人，Popover 内增删行（UserSelect + 备注）；空表示非 Admin 端全员可见。
- **保存流水：** 顶部「保存」仅 `EditAsync` 银行流水；与底部「创建结算单」分离。
- **创建结算单：** 底部勾选费用后点击「创建结算单」即可直接建单（结算时间取当前时间，无需填写备注）；成功后停留本页并刷新关联列表与选费列表。

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
| 2026-07-06 | `Refactor` | 底部选费建单移除结算时间与备注输入，选费后直接点击「创建结算单」完成建单。 | 接口仍传 `settlementTime`（前端取 `dayjs().toISOString()`），`remark` 省略。 |
| 2026-07-05 | `Feature` | 编辑页改版：标题行操作人、左流水/右关联结算（可展开明细）、底部选费一键建单；结算状态与核销状态 Tag 中文展示。 | 拆分为 `operator-title-bar`、`receive-settlement-panel`、`create-settlement-fee-panel` 三个子组件；选费逻辑复用收费结算 `add-fee-drawer/data`。 |
| 2026-06-20 | `Fix` | 修复编辑页操作人 UserSelect 回显数字 ID 问题。 | `buildOperatorRows` 调用 `GetUserAsync` 补齐名称。 |
