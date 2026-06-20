# 付费申请添加费用禁选行本次结算不默认未结金额

## 背景意图

已添加到申请单的费用在抽屉内禁选，但「本次结算」仍回退显示未结金额，易误解为可再次按全额结算。

## 核心逻辑变更

1. 新增 `resolveAppliedAmount`：禁选费用不在 `appliedAmountMap` 时返回 `undefined`，不再回退 `unSettledAmount`。
2. 父页传入 `selectedAppliedAmounts`，禁选行展示申请单上已有的本次结算金额。
3. 全选/单选时跳过禁选费用，不为其写入默认未结金额。

## 避坑指南

- 搜索条件变更会 `clearSelection`，需再次调用 `initDisabledFeeAppliedAmounts` 恢复禁选行展示值。
