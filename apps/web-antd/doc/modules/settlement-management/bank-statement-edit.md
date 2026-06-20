---
title: 银行流水编辑
module: 结算管理
author: Cursor Agent
last_updated: 2026-06-20
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水记录实际到账的收款信息，是收费结算的前置主数据。编辑页除维护流水金额、付款方、银行等字段外，还可配置「操作人」以控制非 Admin 端的可见范围；并展示已关联的收费结算子表。

# 2. 功能与操作说明 (Features & Operations)

- **编辑银行流水：** 进入 `/bank-statement/edit/:id` 加载 `DetailAsync`，左侧维护流水信息，右侧维护操作人列表（增删行、UserSelect 选人、备注）。
- **关联收费结算：** 编辑页底部展示该流水下的收费结算子表，可搜索结算单号、双击跳转编辑、快捷新建收费结算。
- **保存：** 有 `Admin.BankStatement.Edit` 权限时可保存；新建成功 `replace` 到编辑页。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 新建 | 保存成功 | 编辑 | 创建后跳转 `/bank-statement/edit/:id` 继续维护。 |
| 编辑 | 保存成功 | 编辑 | 停留当前页，列表标记需刷新。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **操作人** | 控制该流水在非 Admin 端的可见操作人；空表示全员可见。 | **银行流水**<br/>`BankStatementAdmin/DetailAsync`、`EditAsync`<br/>**用户**<br/>`UserAdmin/GetUserAsync`（名称回显） | 详情若缺 `operationName`，前端按 `operationId` 异步拉用户详情补齐显示名；选中新人时同样异步补齐。 | 保存时仅提交已选 `operationId` 的行。 |
| **付款方** | 流水对应的结算对象（客户）。 | **银行流水**<br/>`DetailAsync` | 变更付款方时清空对方银行。 | 必填。 |
| **关联收费结算** | 基于本流水创建的收费结算单。 | **银行流水**<br/>`GetReceiveSettlementPagedListAsync` | 可跳转收费结算编辑或带 `bankStatementId` 新建。 | 只读子表。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在详情 DTO 中]** `DetailAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需通过 `GetUserAsync` 补齐 `UserSelect` 回显，不可用数字 ID 作为展示名。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-20 | `Fix` | 修复编辑页右侧操作人 `UserSelect` 回显数字 ID 而非姓名的问题；名称解析逻辑抽至 `utils.ts` 与列表共用。 | `buildOperatorRows` 在详情缺 `operationName` 时调用 `GetUserAsync`；`selected-items` 传 `{ id, userName }` 配合 `usePagedSelect.mergeSelectedItems` 完成回显。 |
