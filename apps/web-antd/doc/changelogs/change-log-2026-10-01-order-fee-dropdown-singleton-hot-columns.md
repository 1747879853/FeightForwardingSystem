# 费用录入：下拉主数据单例与勾选列重建优化

## 变更说明

1. `useDropdownSources`：费用代码/币别/行业/汇率/详情缓存改为模块级单例，`initDropdownSources` 幂等；页面预热，应收/应付不再各拉一遍。
2. 单表卸载不再清空共享缓存。
3. `useHotColumns` 不再因勾选/dataSource 依赖整列重建；`hotColumns` watch 去掉 deep。
4. 预警高亮仅刷新 prev∪next 涉及行，避免全表扫格。

## 涉及文件

- `apps/web-antd/src/views/_shared/order-fee/modules/composables/useDropdownSources.ts`
- `apps/web-antd/src/views/_shared/order-fee/modules/composables/useHotColumns.ts`
- `apps/web-antd/src/views/_shared/order-fee/modules/order-fee-table-handsontable.vue`
- `apps/web-antd/src/views/_shared/order-fee/modules/utils/hot-refresh.ts`
- `apps/web-antd/src/views/_shared/order-fee/OrderFeePage.vue`
