# 运价查询同路由多表补齐列持久化独立 gridOptions.id

## 背景意图

`/freight-rate` 运价查询页同时存在列表、批量编辑弹窗、批量新增弹窗三处 `useVbenVxeGrid`，且均开启列自定义（`toolbarConfig.custom`）。此前未显式配置 `gridOptions.id`，会回退为路由名 `FreightRateList`，三表共用同一持久化 key，列配置互相覆盖。

## 核心逻辑变更

- 在 `freight-rate/data.ts` 导出三个稳定常量：
  - `FREIGHT_RATE_LIST_TABLE_ID` = `FreightRateList`
  - `FREIGHT_RATE_BATCH_EDIT_TABLE_ID` = `FreightRateBatchEdit`
  - `FREIGHT_RATE_BATCH_ADD_TABLE_ID` = `FreightRateBatchAdd`
- 列表、批量编辑弹窗、批量新增弹窗分别在 `gridOptions.id` 声明上述常量；adapter 会据此写入 `columnPersist.tableId`。

## 避坑指南

- 同一路由下出现 ≥2 个 `useVbenVxeGrid` 时，必须显式配置 `gridOptions.id`（或 `columnPersist.tableId`），不要依赖路由回退。
- `rowConfig.keyField` 只是行主键，与列持久化表格 id 无关。
- 列表历史配置若已按 `FreightRateList` 保存，本次列表 id 保持同名，用户既有列设置可延续；弹窗此前误写到列表 key 的配置不会自动迁移。
