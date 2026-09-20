---
title: 银行流水按费用核销对账单检索
date: 2026-09-20
module: settlement-management
---

# 背景意图

TAPD #0150：按费用核销选费抽屉要按客户对账单号缩小费用范围。后端 `d70bd2ae` 已给 `GetOrderFeeGroupAsync` 增加模糊字段 `statementNum`。

# 核心逻辑变更

- 选费检索 schema 增加「客户对账」，查询组装 `statementNum`（去首尾空格，空不下发）。
- 银行流水「按费用核销」与收费核销「添加明细」共用该 schema，两处一起带上。
- 一条费用可进多张对账单，命中任意一张即返回。

# 避坑指南

- 不要把对账单号塞进现有「编号」：编号只搜委托编号 / 主提单号。
- 远程需先部署含 `StatementNum` 的后端，否则该条件会被忽略。
