---
title: 发票商品编码 - CurrencyId 弱外键与币别 SimpleDto
module: 发票商品编码
author: AI
last_updated: 2026-07-28
---

# 1. 背景意图 (Background)

发票商品编码使用可空 `CurrencyId` 弱关联币别表（不做 EF 外键导航）；新建/编辑需校验存在性；列表/详情返回 `CurrencySimpleDto`。

# 2. 核心逻辑变更

| 项                | 说明                                                     |
| :---------------- | :------------------------------------------------------- |
| 实体              | `CurrencyId`（可空 long）+ 导航属性 `Currency`           |
| 新建/编辑         | 有值时校验 Currency 存在，否则「币别不存在，请重新选择」 |
| 列表/详情         | 返回 `currencyId` + `currency`（CurrencySimpleDto）      |
| `DefaultCurrency` | 历史冗余字符串，保留字段但不参与业务                     |

# 3. 避坑指南

- 弱外键不会在数据库建 FK 约束，靠业务校验防脏 Id。
- 迁移自行生成列名 `CurrencyId`（若曾建过 `DefaultCurrencyId` 需改名或重建）。
