# 2026-07-07 海运出口应收应付费用打印

## 背景意图

海运出口编辑页「应收应付」Tab 需支持按勾选费用行打印，与后端 `PrintJsonType` 新增枚举 `RecOrderFeeList`（1000）、`PayOrderFeeList`（1500）对齐。

## 核心逻辑变更

1. **`PrintJsonType` 枚举**（`components/print-format/types.ts`）
   - 新增 `RecOrderFeeList = 1000`、`PayOrderFeeList = 1500`。

2. **费用表工具栏打印**（`orderFee/modules/order-fee-table.vue`）
   - 应收表打印使用 `PrintJsonType.RecOrderFeeList`，应付表使用 `PayOrderFeeList`。
   - 须先勾选行；`printJson` 为选中 `OrderFeeDto` 数组的 `JSON.stringify`（去除前端 `_rowKey`）。

- 选中行含未保存（无 `id`）费用时提示「请先保存费用后再打印」。
- 更改单模式（`mode=changeOrder`）不展示打印按钮。
- 选中行优先从 `gridApi.getCheckboxRecords()` 读取，避免与 `dataSource` 的 `_rowKey` 不同步导致静默失败。

## 避坑指南

- 费用打印 JSON 为 `[{}, {}]` 费用列表，**不是**整份 `SeaExportDto`。
- 模板筛选依赖 `printJsonType` 数值；后端需已配置 `1000`/`1500` 对应打印格式。
- 与详情打印共用全局 `usePrintFormat` + `PrintFormatModal`，勿重复挂载弹窗。
