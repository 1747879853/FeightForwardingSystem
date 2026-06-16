# 新建付费申请自动弹出添加费用抽屉

## 背景意图

用户进入「新建付费申请」页面时，首要操作是选择费用。与付费结算新建页一致，应在页面挂载后自动打开添加费用抽屉，减少一次手动点击；编辑已有申请时不应自动弹出。

## 核心逻辑变更

- 文件：`src/views/fee-management/payment-application/form.vue`
- `onMounted` 分支：`isEdit` 时仍调用 `loadEditData()`；新建模式在 `nextTick` 后调用 `handleOpenAddFee()`。

## 避坑指南

- 仅 `/fee-management/payment-application/add` 路由（无 `id` 参数）会触发，`/payment-application/:id/edit` 不受影响。
- 需等子组件 `AddFeeDrawer` 挂载后再 `open`，故使用 `nextTick`。
