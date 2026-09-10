# 自动费用模板明细表对齐费用录入样式

## 背景意图

自动费用模板编辑页底部费用明细 Handsontable 观感偏「裸表」：工具栏挤在 Card 标题、固定 30px 行高与 `line-height: 3px` hack，和费用录入表格不一致。

## 核心逻辑变更

- `edit.vue`：费用明细改为 `fee-detail-panel`（圆角边框 + 渐变工具栏 + 蓝色标题条），操作按钮移入表头行。
- `order-fee-template-table.vue`：去掉强制行高 hack；表头/选中/边框样式对齐 `OrderFeeTableCore`。
- `useHotSettings.ts`：高度 420、可拖拽调列宽、`stretchH: 'none'`，去掉固定 `rowHeights: 30`；用 `hiddenColumns` 真正隐藏 `*_value` 内部列（原先 `visible: false` 对 HOT 无效，表头仍显示「xxx_value」）。

## 避坑指南

- 只对齐展示层，不引入费用录入的 checkbox/完结/打印等业务能力。
- 勿再加 `line-height: 3px` 一类行高 hack，会与 Handsontable 编辑器错位。
