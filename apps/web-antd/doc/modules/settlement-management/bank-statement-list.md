---
title: 银行流水列表
module: 财务管理
author: Cursor Agent
last_updated: 2026-07-25
---

# 1. 业务背景说明 (Background)

**白话解释：** 银行流水列表是财务管理分组下的入口，用于检索、新建和进入编辑。列表展示流水号、交易时间、付款方、金额及操作人等关键信息；操作人决定该流水在非 Admin 端的可见范围。侧边栏自独立顶级菜单迁入「财务管理」分组，URL 仍为 `/bank-statement`。

# 2. 功能与操作说明 (Features & Operations)

- **查询列表：** `/bank-statement` 调用 `BankStatementAdmin/GetPagedListAsync`，支持流水号、结算对象、币别、核销状态、交易时间、创建人、组织等筛选。
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
| **付款方** | 流水对应的结算对象（客户简易对象）。 | `GetPagedListAsync` → `settlement`（`id`/`name`/`fullName`/`address`） | 列 `field` 仍为 `settlementName`（保留排序与列持久化键），展示走 `formatter` 取 `settlement?.name`。 | 对象可能为 `null`，需空值兜底。 |
| **已结算金额** | 该流水下所有收费结算的总结算金额（收为正、付为负）。 | `GetPagedListAsync` → `settledAmount` | 后端冗余字段，前端只读展示。 | — |
| **核销状态** | 流水与收费结算的核销进度。 | `GetPagedListAsync` → `writeOffStatus`（枚举 `BankStatementWriteOffStatus`） | 0 待核销 / 1 部分核销 / 2 核销完成；列表以 Tag 展示，查询区可筛选。 | — |
| **创建人** | 流水创建人姓名。 | `GetPagedListAsync` → `creatorUserName` | — | — |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：操作人名称可能不在列表 DTO 中]** `GetPagedListAsync` 的 `bankStatementUsers` 可能只返回 `operationId`，前端需在列表 enrichment 阶段调用 `GetUserAsync` 补齐姓名，不可用数字 ID 作为列展示。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-25 | `Refactor` | 「付款方」列改读结算对象对象化后的 `settlement.name`，接口不再返回 `settlementName`。 | 列 `field` 保留 `settlementName` 以维持排序字段映射与列配置持久化，取值改由 `formatter` 读 `row.settlement?.name`。 |
| 2026-07-11 | `Refactor` | 侧边栏从独立顶级菜单迁入「财务管理」分组；路由定义移至 `settlement-management.ts`，path `/bank-statement` 不变。 | 删除独立 `bank-statement.ts` 模块文件，以嵌套子路由挂载在财务管理下。 |
| 2026-06-29 | `Feature` | 列表新增「已结算金额」「核销状态」列；查询区支持按核销状态筛选。收费核销页「银行流水」Tab 同步展示与筛选。 | 列与筛选项定义在 `views/bank-statement/data.ts`，Admin 列表与权限过滤 Tab 共用；核销状态 Tag 通过 `#writeOffStatus` 插槽渲染。 |
| 2026-06-20 | `Fix` | 列表「操作人」列改为展示用户姓名；接口缺 `operationName` 时异步补齐，与编辑页逻辑统一至 `utils.ts`。 | `enrichBankStatementListItems` 对当前页 `operationId` 去重后批量请求，避免 N 次重复 `GetUserAsync`。 |
