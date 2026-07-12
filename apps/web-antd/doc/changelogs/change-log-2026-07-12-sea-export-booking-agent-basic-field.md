# 2026-07-12 海运出口新建/编辑补齐订舱代理字段

## 背景意图

海运出口新建与编辑基础信息区应按布局顺序展示「订舱代理」（`bookingAgentId`），供选择行业类别为订舱代理（`o`）的客户并随单保存。字段 schema、提交映射与列表展示此前已具备，但 UI 因分区迁入列表遗漏而未渲染。

## 核心逻辑变更

1. **迁入基础信息：** 将 `bookingAgentId` 纳入 `BASIC_MODULE_EXTRA_FIELD_NAMES`，从船期 schema 迁入基础信息表单，并按 `BASIC_INFO_FIELD_ORDER` 排在船代之后、车队之前。
2. **编辑回显：** 详情 `selectedItems` 回填改由 `basicInfoFormApi.updateSchema` 处理，不再写到已不含该字段的 `shipmentFormApi`。
3. **既有链路不变：** `useShipmentFormSchema` 中 `ClientSelect`（`industryCategory: 'o'`）、`flattenDetail` / `buildSeaExportDto` 的 `bookingAgentId` 映射保持原样。

## 避坑指南

- `SHIPMENT_MOVED_TO_BASIC_FIELD_NAMES` 与迁入过滤必须同源：若只从船期区剔除、未加入 `BASIC_MODULE_EXTRA_FIELD_NAMES`，字段会「消失」——既不在船期也不在基础信息。
- 编辑态 `updateSchema(selectedItems)` 必须落在实际承载该字段的表单实例上。
