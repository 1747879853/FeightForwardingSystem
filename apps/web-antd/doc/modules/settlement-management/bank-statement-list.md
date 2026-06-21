---
title: 银行流水列表
module: 结算管理
author: Cursor Agent
last_updated: 2026-06-20
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水列表是结算管理的主入口，用于检索、新建和进入编辑。列表展示流水号、交易时间、付款方、金额及操作人等关键信息；操作人决定该流水在非 Admin 端的可见范围。

# 2. 功能与操作说明 (Features & Operations)

- **查询列表：** `/bank-statement` 调用 `BankStatementAdmin/GetPagedListAsync`，支持流水号、结算对象、币别、交易时间、创建人、组织等筛选。
- **新建/编辑：** 顶部「新建」进入新增页；双击行或从编辑页返回后列表自动刷新。
- **删除：** 选中单行后点击「删除」，调用 `DeleteAsync`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明                          |
| :------- | :---------- | :------- | :-------------------------------- |
| 列表     | 双击行      | 编辑     | 跳转 `/bank-statement/edit/:id`。 |
| 列表     | 新建        | 新增     | 跳转 `/bank-statement/add`。      |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **操作人** | 该流水的可见操作人，多人以 `/` 拼接展示。 | **银行流水**<br/>`GetPagedListAsync`<br/>**用户**<br/>`UserAdmin/GetUserAsync`（名称补齐） | 接口 `operationName` 为空时，列表查询后按 `operationId` 异步拉用户姓名写入行数据再渲染。 | 只读展示。 |
| **付款方** | 流水对应的结算对象名称。 | `GetPagedListAsync` → `settlementName` | — | — |
| **创建人** | 流水创建人姓名。 | `GetPagedListAsync` → `creatorUserName` | — | — |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在列表 DTO 中]** `GetPagedListAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需在列表 enrichment 阶段调用 `GetUserAsync` 补齐姓名，不可用数字 ID 作为列展示。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-20 | `Fix` | 列表「操作人」列改为展示用户姓名；接口缺 `operationName` 时异步补齐，与编辑页逻辑统一至 `utils.ts`。 | `enrichBankStatementListItems` 对当前页 `operationId` 去重后批量请求，避免 N 次重复 `GetUserAsync`。 |
