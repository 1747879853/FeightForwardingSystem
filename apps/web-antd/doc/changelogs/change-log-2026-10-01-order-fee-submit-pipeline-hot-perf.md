# 费用录入：提交管线与 Handsontable 性能落地

## 变更说明

### 功能正确性

1. 整票提交统一走表内 `getSanitizedFees`（还原 `*_value`），并过滤 `isSavableOrderFeeRow`。
2. 提交前检测 `isFeeDirty` / 未落库新行，提示先保存。
3. 顶栏申请修改/删除与表内同一 eligibility（审核通过 + 开票/结算金额全 0）。
4. `convertIdsToLabels` 恢复写入 `settlementId_value`。
5. 加载时结算派生状态同步 `feeStatus` 与 `combinedFeeStatus`。
6. 批量引入去掉模板 `@confirm` 双触发；顶栏审核菜单补权限。

### 性能

1. `afterChange` 向联动传入真实 Handsontable 实例，启用脏行 `refreshHotSourceRows`。
2. `dataSource` deep watch：同源数组就地编辑时跳过整表 `loadData`。

## 涉及文件

- `apps/web-antd/src/views/_shared/order-fee/OrderFeePage.vue`
- `apps/web-antd/src/views/_shared/order-fee/modules/order-fee-table-handsontable.vue`
- `apps/web-antd/src/views/_shared/order-fee/modules/composables/useHotSettings.ts`
- `apps/web-antd/src/views/_shared/order-fee/modules/composables/useOrderFeeActions.ts`
- `apps/web-antd/src/views/_shared/order-fee/modules/composables/useOrderFeeData.ts`
- `apps/web-antd/src/views/_shared/order-fee/modules/utils/helpers.ts`
- `apps/web-antd/src/views/_shared/order-fee/modules/batch-import-fee-modal.vue`
