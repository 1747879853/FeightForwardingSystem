---
title: 银行流水列表新增已结算金额与核销状态
date: 2026-06-29
---

# 背景意图

后端在银行流水实体上新增冗余字段 `settledAmount`（已结算金额）与 `writeOffStatus`（核销状态），用于列表快速展示与筛选，避免前端实时聚合收费结算数据。

# 核心逻辑变更

1. **API 类型**：`BankStatementListDto` / `BankStatementDetailDto` 增加 `settledAmount`、`writeOffStatus`；`BankStatementQueryDto` 增加 `writeOffStatus` 筛选；新增枚举 `BankStatementWriteOffStatus`（0 待核销 / 1 部分核销 / 2 核销完成）。
2. **列表列**：银行流水列表（`/bank-statement`）与收费结算页「银行流水」Tab（`/settlement-management/receive-settlement?tab=bank-statement`）共用 `views/bank-statement/data.ts`，在「总金额」后展示「已结算金额」「核销状态」列。
3. **筛选**：查询区新增「核销状态」下拉，传参 `writeOffStatus` 至 `GetPagedListAsync`。
4. **展示**：核销状态以 Tag 着色（待核销 default / 部分核销 warning / 核销完成 success）。

# 避坑指南

- 已结算金额与核销状态由后端维护，前端不做聚合计算；列表仅展示接口返回值。
- 收费结算页银行流水 Tab 与 Admin 银行流水列表共用列配置，改一处即两处生效；权限接口分别为 `BankStatementAdmin` 与 `BankStatement`。
