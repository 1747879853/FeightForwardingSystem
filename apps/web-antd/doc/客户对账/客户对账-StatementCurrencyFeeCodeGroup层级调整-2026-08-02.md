# 客户对账-StatementCurrencyFeeCodeGroup层级调整-2026-08-02

## 背景意图

详情打印（`IsPrint=true`）时，`StatementCurrencyFeeCodeGroup`（按币别+费用代码汇总）原先挂在 `StatementDto` 根级，会把整张对账单所有费用混在一起汇总，无法按业务单分别展示。实际打印模板需要挂在每个业务分组 `OrderFeeGroups` 下。

## 核心逻辑变更

1. **DTO**：从 `StatementDto` 移除 `StatementCurrencyFeeCodeGroup`，改挂到 `OrderFeeAndSeaExportDto`。
2. **DetailAsync**：仍仅在 `IsPrint=true` 时计算；按当前业务组内 `OrderFees` 做 `CurrencyId + FeeCodeId` 分组，写入对应 `orderFeeGroups[i].statementCurrencyFeeCodeGroup`。
3. **排序规则不变**：USD → RMB → 其他，再按币别代码、费用代码。

## 避坑指南

- 打印模板字段路径需从根级 `[客户对账.费用按币别和费用代码分组列表]` 改为业务分组下路径，例如数据带绑定在 `OrderFeeGroups` 时用该组内的 `StatementCurrencyFeeCodeGroup`。
- 非打印详情（`IsPrint` 不为 true）该字段仍为 null，不要依赖前端常驻展示。
