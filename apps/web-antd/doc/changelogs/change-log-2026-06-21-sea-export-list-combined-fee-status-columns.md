# 海运出口列表对接组合费用状态字段

## 背景意图

分页接口 `GetPagedListAsync` 新增 `receiveFeeStatus`、`payFeeStatus`，表示该委托下应收/应付方向（含更改单费用）的组合费用流转状态，覆盖驳回、申请修改/删除、结算等异常与进度。列表需在保留原有最小审核状态列的同时，展示这两列组合状态。

## 核心逻辑变更

1. **API 类型**：`SeaExportDto` 补充 `receiveFeeStatus`、`payFeeStatus`（`number | null`）。
2. **枚举选项**：新增 `getSeaExportFeeStatusOptions()`，映射后端 `SeaExportFeeStatus` 八态（录入/提交审核/审核通过/部分结算/结算完毕/驳回/申请修改/申请删除）。
3. **列表列**：在费用锁定/业务锁定列之后展示「应收费用状态」「应付费用状态」两列，复用 `CellTag` 渲染；原最小审核状态列（`feeStatusReceive`/`feeStatusPay`）已移除。

## 避坑指南

- `SeaExportFeeStatus` 与单笔费用 `FeeStatus` 枚举值不同（如驳回为 5 而非 3），列配置勿复用 `getFeeStatusOptions()`。
- 组合状态字段与最小状态字段并存，列标题已用 i18n 区分，避免业务误解。
- 对应方向无费用时返回 `null`，单元格不展示标签。
