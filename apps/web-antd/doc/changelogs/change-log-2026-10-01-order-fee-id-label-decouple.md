# 费用录入：下拉格 data 存 ID，展示与编辑解耦

## 变更说明

1. 去掉 `convertIdsToLabels`：费用代码/行业/币别/结算对象/单位在 dataSource 中保持 ID。
2. Handsontable renderer / `afterBeginEditing` 按选项列表把 ID 映射为 label 展示与编辑。
3. `afterChange` 选中项写回 ID（兼容粘贴 ID）；联动填充同步写 ID + `__settlementName`。
4. 结算对象解析支持按 id / name / label 匹配。

## 涉及文件

- `modules/utils/helpers.ts` / `helpers.test.ts`
- `modules/composables/useHotColumns.ts`
- `modules/composables/useHotSettings.ts`
- `modules/composables/useOrderFeeLinkage.ts`
- `modules/order-fee-table-handsontable.vue`
