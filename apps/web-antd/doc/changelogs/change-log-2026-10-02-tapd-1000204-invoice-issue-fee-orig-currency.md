# TAPD #1000204 发票开出抽屉费用明细增加原币币别

## 背景意图

选开票申请抽屉展开费用明细时，只显示原币金额不显示币别，汇率折算后容易误解；需增加「原币币别」列。

## 核心逻辑变更

- `FeeSelectionDrawerForIssue` 二级费用列在「金额」后增加「原币币别」，绑已有 `currencyCode`（费用原币 `orderFee.currency.code`）。

## 涉及文件

- `views/settlement-management/invoice-issue/components/FeeSelectionDrawerForIssue.vue`
