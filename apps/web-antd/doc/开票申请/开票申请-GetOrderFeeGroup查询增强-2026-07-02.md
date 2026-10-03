---
title: GetOrderFeeGroupAsync 查询增强
module: 开票申请
author: auto-doc-sync
last_updated: 2026-07-02
---

# 背景意图

开票申请加费用时，`GetOrderFeeGroupAsync` 需要支持关键字快速检索（主提单号/委托编号）、按收付类型筛选，并在返回的业务信息中展示开船日期。

# 核心逻辑变更

## 入参 `InvoiceApplicationFeeQueryDto`

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| `Keyword` | `string` | 模糊匹配 `TransportOrder.MblNum` 或 `TransportOrder.CommissionNum` |
| `PaySide` | `PaySide?` | 可空；有值时仅返回对应收付类型的费用 |

## 出参 `TransportOrderSimpleDto`

- `ETD`（开船日期）已在接口组装时赋值 `TransportOrder.ETD`，本次在接口文档中补充说明。

## 服务实现

`InvoiceApplicationAdminAppService.GetOrderFeeGroupAsync`：

- `PaySide`：`.WhereIf(input.PaySide.HasValue, x => x.PaySide == input.PaySide.Value)`
- `Keyword`：`.WhereIf(!string.IsNullOrWhiteSpace(input.Keyword), x => x.TransportOrder.CommissionNum.Contains(input.Keyword) || x.TransportOrder.MblNum.Contains(input.Keyword))`

# 变更日志

| 日期 | 变更类型 | 业务功能变动 |
| :-- | :-- | :-- |
| 2026-07-02 | `Feature` | 入参新增 `Keyword`、`PaySide`；返回 `transportOrder.etd` 开船日期 |
