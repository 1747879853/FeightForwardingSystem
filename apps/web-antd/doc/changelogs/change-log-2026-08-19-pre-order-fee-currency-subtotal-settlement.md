---
title: 业务联系单费用小计按币别拆分，提交审核拦截空结算对象
date: 2026-08-19
module: pre-order
---

# 背景意图

TAPD [#1161580498001000680](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000680) 剩余未修项：

1. 费用区底部「应收/应付合计」把不同币别金额直接相加。
2. 费用未填结算对象仍可提交审核，审核通过后生成到海运出口仍是空结算对象。
3. 业务联系单引入的海出费用，「录入方式」列把枚举数字当文本显示（Handsontable `type=text` 把 `6` 变成 `"6"`，严格相等匹配失败）。

装运方式默认整柜、中转港保存、审核列表默认「审核中」此前已修，不在本次范围。

# 核心逻辑变更

1. `views/pre-order/modules/fee-unit.ts`
   - `checkPreOrderFees` 增加结算对象必填（空串同样拦截）。
   - 新增 `summarizePreOrderFeesByCurrency`：按币别代码分别累计应收/应付。
2. `views/pre-order/modules/fee-table.vue`
   - 底部小计改为 `USD 100.00 / CNY 200.00` 形式。
   - 选币别 / 默认 USD / 一键生成海运费时写入 `currency` 快照，避免小计露出 id。
3. `views/sea-export-admin/orderFee/modules/utils/helpers.ts`
   - `getDataEntryMethodLabel` 用数值比较，`"6"` 也能显示「业务联系单引入」。

# 避坑指南

- 不要把多币别金额加总成一个数；没有币别对象时才回退显示 id。
- 保存草稿仍只提示不拦截；**提交审核**才硬拦空结算对象。
- Handsontable 只读枚举列常被写成 `type: 'text'`，匹配标签时必须兼容 string/number，不要用 `===` 对枚举。
