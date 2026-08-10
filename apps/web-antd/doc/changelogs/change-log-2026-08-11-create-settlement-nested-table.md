# 银行流水新建核销嵌套表改用 NestedDataTable

## 背景意图

银行流水「新建核销」抽屉内「按费用 / 按发票」选明细仍用双层 Ant Table，与收费核销「添加开票结算明细」抽屉的 `NestedDataTable` 体验不一致。

## 核心逻辑变更

- `create-settlement-fee-panel`、`create-settlement-invoice-panel` 外层+内层改为 `NestedDataTable`。
- 内层勾选改为 Checkbox 列，支持组内全选 / 半选。
- 费用侧 `buildOrderRow` 补 `orderFees`；新增共享 `feeItemColumns`；对象化字段（费用名/币别/结算对象）按 `feeCode` / `currency` / `settlement` 读取。
- 开票侧复用 `invoiceItemColumns` 与 `buildInvoiceGroupRow.items`。

## 避坑指南

- 收费核销独立页的「添加结算明细」抽屉（`add-fee-drawer`）仍为双层 Ant Table，勿混用预期。
- NestedDataTable 不走 Ant `customRender`，金额/时间等展示需写在 `outerBodyCell` / `innerBodyCell`。
