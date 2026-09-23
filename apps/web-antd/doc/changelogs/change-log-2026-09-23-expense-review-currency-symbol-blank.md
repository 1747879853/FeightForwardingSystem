# TAPD #1000167：应收应付审核币别符号未维护时不展示 undefined

## 背景

[TAPD #1161580498001000167](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000167)：应收应付审核审批金额前缀拼接币别符号时，符号未维护会拼出字面量 `undefined`；同时确认币别管理列表需有「币别符号」列。

## 改动

1. **审核详情合计**（`audit-approval/expense-all/modules/detail.vue`）：`transCurrencySymbol` 在无符号时返回空串；币别名称缺省也不再落到 `undefined`。
2. **审核费用表**（`_shared/order-fee/modules/all-order-fee-table.vue`）：同样空串回退；金额字段用 `?? ''` 避免 `￥undefined`。
3. **费用录入合计**（`OrderFeePage.vue`）：同一拼接问题一并收口。
4. **币别管理**：列表/表单本已有 `symbol` 列；文案改为「币别符号」，并补英文 `Currency Symbol`。

## 验收

- 币别未填符号时，审核详情合计与费用金额列只显示数字，无 `undefined` 前缀。
- 系统管理 → 币别管理列表可见「币别符号」列，可维护。
