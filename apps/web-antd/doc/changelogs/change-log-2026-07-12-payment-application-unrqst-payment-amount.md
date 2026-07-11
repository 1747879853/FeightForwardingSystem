# 付费申请未结金额改用 unRqstPaymentAmount 并限制本次结算

## 背景意图

付款申请「添加费用」抽屉中「未结金额」原先展示 `unSettledAmount`（未结算金额），与付费申请业务口径不符。付费申请应使用 `unRqstPaymentAmount`（未付费申请金额）作为可申请上限。

## 核心逻辑变更

1. 添加费用抽屉「未结金额」列、默认值与外层订单「未收/未付」汇总均改为 `unRqstPaymentAmount`。
2. 「本次结算」输入框增加 `max=unRqstPaymentAmount`；确认添加前校验 `0 < appliedAmount <= unRqstPaymentAmount`。
3. 付款申请编辑/新增页外侧费用明细「未结金额」列同步展示 `unRqstPaymentAmount`。

## 避坑指南

- `unSettledAmount` 用于结算核销场景；`unRqstPaymentAmount` 用于付费申请场景，二者不可混用。
- 已禁选费用（已加入申请单）的「本次结算」仍展示 `selectedAppliedAmounts`，不受未结金额上限回写影响。
