---
title: 付费申请选费用抽屉支持按对账单号检索
date: 2026-08-31
module: fee-management / payment-application
---

# 背景意图

照着客户对账单做付费申请时，原来只能按委托编号/提单号找费用。后端 `GetOrderFeeGroupAsync` 已支持 `StatementNum`，抽屉没把这个条件发出去。

# 核心逻辑变更

- 添加费用抽屉搜索增加「对账单号」，trim 后传 `StatementNum`；空值不传。输入停 400ms 再自动查询（debounce，不用 throttle）。
- 展开费用行增加「对账单号」列，展示 `statements[].statementNum`（多张中文逗号拼接）。
- 开票申请抽屉此前已有同款检索，本次未改。

# 避坑指南

- 不要传空字符串：后端 `WhereIf` 只认有内容的单号，空串会变成无效过滤。
- 接口仍只返回已审核、剩余可申请金额 > 0 的费用；对账单号是额外与条件，不是另开一套列表。
- 内层列读本页映射的 `statementNums`，不要绑已不存在的平铺 `*Name`。
- 输入框自动查询必须用 **debounce**，不能用 throttle：throttle 会立刻发出第一个字符（输入 123 只查了 1）。停 400ms 再查，点查询/重置时取消未发出的定时器。
