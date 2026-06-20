# 付费申请添加费用抽屉不再传 Id 查询

## 背景意图

后端 `GetOrderFeeGroupAsync` 不再依赖当前付费申请 `Id` 过滤可选费用；编辑页打开添加费用抽屉时，列表查询应与其他场景一致，仅按搜索条件拉取费用。

## 核心逻辑变更

1. `add-fee-modal/index.vue`：`fetchData` 调用 `getOrderFeeGroupAsync` 时移除 `Id` 参数。
2. `add-fee-modal/data.ts`：删除 `AddFeeDrawerProps.paymentApplicationId`。
3. `payment-application/form.vue`：打开抽屉时不再传入 `paymentApplicationId`。

已选费用仍通过 `selectedFeeIds` 在前端禁用勾选，避免重复添加。

## 避坑指南

- 不要假设后端会按申请单 Id 排除已关联费用；编辑页依赖 `selectedFeeIds` 做前端禁选。
- 接口类型 `GetOrderFeeGroupParams.Id` 仍保留为可选字段，供其他调用方使用。
