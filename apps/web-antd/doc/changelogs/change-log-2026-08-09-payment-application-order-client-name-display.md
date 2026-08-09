# 2026-08-09 付费申请委托单位列回显 client.name

## 背景意图

付费申请「添加费用」抽屉与详情费用分组表「委托单位」列为空。选费接口 `PayAppFeeGroupDto` 已对象化为 `client.name`，无平铺 `clientName`；表格列仍读 `clientName`。对应 TAPD：[#0690](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000690)。

## 核心逻辑变更

- `add-fee-modal/data.ts`：`buildOrderRow` 显式写 `clientName: order.client?.name ?? ''`
- `payment-application/form.vue`：`mapDetailToFeeRows` 改为 `order?.client?.name ?? order?.clientName`（`clientId` 同步兜底 `client?.id`）
- `payment-application-admin.ts`：`TransportOrderSimpleDto` 补 `client?: ClientSimpleDtoForOrder`

## 避坑指南

- `buildSelectedFeeItem` 此前已映射 `client?.name`，确认进主表可能有值；抽屉列表走 `buildOrderRow` 的 `...order` 不会自动产生 `clientName` 字段
- 列 `field`/`dataIndex` 仍用本地视图字段 `clientName`，不要改成嵌套路径（`NestedDataTable` 默认 `record[dataIndex]`）
