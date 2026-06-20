# 付费申请费用明细外层表动态申请合计列

## 背景意图

付款申请新增/编辑页费用明细外层分组表需按已申请费用的原币别，动态展示「{币别}申请合计」列，便于按组核对本次申请金额。

## 核心逻辑变更

1. `collectAppliedCurrencies` 从费用明细收集币别，按 `currencyId` 升序生成列定义。
2. `buildAppliedAmountCurrencyColumns` 生成 `{币别}申请合计` 列，追加在客服列之后。
3. `groupFeesByOrder` 为每组写入 `applied_amount_{currencyId}` 字段，汇总原币 `appliedAmount`；无该币别费用时为 `0.00`。
4. 指定结算币别模式下仍按原币汇总，footer 全局合计保持 Tag 展示不变。

## 避坑指南

- 动态列字段 key 使用 `applied_amount_` 前缀，模板渲染需避免 Vue 模板内 TypeScript 断言，改用脚本侧 helper 格式化金额。
