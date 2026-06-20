# 付费申请选费分组维度适配（业务 + 结算对象）

## 背景意图

后端 `GetOrderFeeGroupAsync` 分组键由「按业务」改为「按业务 + 结算对象 `(TransportOrderId, SettlementId)`」，分页 `totalCount` 同步为分组键总数。前端添加费用抽屉与编辑页费用明细需对齐新结构，避免同一业务多结算对象时行 key 冲突或金额汇总错误。

## 核心逻辑变更

- **API 类型**：`PayAppFeeGroupDto` 新增 `settlementId`、`settlement`（`ClientSimpleDto`）。
- **添加费用抽屉**：
  - 主表 `row-key` 改为复合键 `groupKey`（`${transportOrderId}_${settlementId}`）；
  - 勾选状态 `selectionMap` 按 `groupKey` 索引；
  - 外层固定列新增「结算对象」（优先 `settlement.fullName`，回退 `name` / 费用 `settlementName`）；
  - 展开子表移除「结算对象」列（与外层重复）。
- **编辑页明细**：
  - `groupFeesByOrder` 分组键改为 `transportOrderId + settlementId`；
  - 外层分组表新增「结算对象」列，内层明细移除该列；
  - 底部统计文案由「共 {0} 票」改为「共 {0} 组」。
- **业务约束不变**：一申请单仍限制单一结算对象；已有费用时搜索区结算对象继续锁定。

## 避坑指南

- 列表 `row-key` 不能仅用业务 `id`，必须结合 `settlementId`。
- 动态币别合计基于分组内已过滤的 `orderFees`，勿按整票业务汇总。
- 分页 `totalCount` 为分组条数，不是业务票数。
