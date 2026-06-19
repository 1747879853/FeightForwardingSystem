# 海运出口列表对接费用状态字段

## 背景意图

分页接口 `GetPagedListAsync` 已返回 `feeStatusPay`、`feeStatusReceive`，表示该委托下应付/应收费用的最小审核状态。列表页需展示这两列，便于业务人员快速识别费用审核进度。

## 核心逻辑变更

1. **API 类型**：`SeaExportDto` 补充 `feeStatusPay`、`feeStatusReceive`（`number | null`）。
2. **列表列**：在费用锁定/业务锁定列之后新增「应收费用」「应付费用」两列，复用 `getFeeStatusOptions()` 与 `CellTag` 渲染，与费用审核列表口径一致。
3. **空值语义**：对应方向无费用时字段为 `null`，单元格不展示标签。

## 避坑指南

- 两字段为同一 `FeeStatus` 枚举（0–3 有效），取该方向所有费用的**最小状态值**，不代表单笔费用状态。
- 字段位于 `SeaExportDto` 顶层，不在 `transportOrder` 内，列配置勿写错层级。
