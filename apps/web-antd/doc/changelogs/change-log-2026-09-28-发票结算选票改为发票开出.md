# 发票结算选票改为发票开出到费用

## 背景意图

按发票结算要以发票开出为单位选票：同一费用在一张发票开出下分在几张开票申请里时合并成一行。保存按「发票开出 + 费用」提交，后端再按开票金额比例拆开。`actualSettled` 由前端录入。TAPD #1000177。

## 核心逻辑变更

- 拉取改为 `GetInvoiceIssueGroupForSettlementAsync`。选择弹窗只有「发票开出 → 费用」两层，搜索为开出单号、发票号、开票时间。
- 新建、追加每行传 `invoiceIssueId + orderFeeId + settledAmount`，并必传本次结算。追加时传追加之后整张单的本次结算。
- 同一费用可出现在多张发票开出下，勾选时按费用累计本次金额，超过共享 `invoiceSettleableAmount` 则拦住。
- 本次结算参考值：每行 `round(本次金额 × exchangeRate, 2)` 收正付负相加；缺汇率时请手工填。银行流水新建发票结算面板同步。

## 避坑指南

- 拉取结果里的 `settledAmount` 是该费用历史累计已结算，不是本次要结的金额；默认录入用 `invoiceSettleableAmount`。
- 保存后详情的原始结算金额可能与参考值差约 1 分，属后端拆分舍入。
- 原接口 `GetInvoiceApplicationGroupForSettlementAsync` 与入参 `invoiceApplicationItemId` 已删除，不要再调。
