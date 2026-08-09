# 付费申请固定币别结算卡改为折币合计一行

## 背景意图

指定（固定）结算币别时，结算币别卡片原先按各原始币别分行展示「付款金额」（原币净额），与「支付币别应为固定结算币别、金额应为费用明细申请金额折币之和」的业务口径不符。同时费用明细旧「申请折币」按原始费用金额 × 汇率计算，易与「本次申请金额 × 申请汇率」混淆。

## 核心逻辑变更

- 结算币别卡片列名「付款金额」改为「申请金额」；新增「已核销」列，回填详情 `currencyGroup[].settledAmount`。
- **按票原币**：仍按费用币别分行，申请金额为 `summarizeByCurrency`（付 − 收）。
- **固定币别**：表格合并为一行——支付币别取锁定结算币别；申请金额 = `calcAppliedConvertedTotal`（各费用 `appliedAmount × rate` 后按付 − 收求和）；已核销取结算币别 id 对应的 `settledAmount`。
- 费用明细（申请表单 + 付费审批详情）删除「申请折币」（`amount × rate`），新增「申请金额折币」（`appliedAmount × rate`），文案 key `appliedAmountConverted`。
- `CurrencyGroupDto` 补充可选字段 `settledAmount`。

## 避坑指南

- 固定币别「已核销」按结算币别 id 取 `currencyGroup`；若后端仍只按原始币别分组且无结算币别条目，该格会为 0。
- 折币合计必须走带符号的 `signedAppliedAmount` 再乘汇率，勿对正数 `appliedAmount` 直接加总后再减收。
- 审核详情面板与申请表单共用 `calcAppliedAmountConverted`，勿再引用已删除的 `calcConvertedApplied`。
