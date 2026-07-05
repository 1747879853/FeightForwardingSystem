# vxe 列显隐持久化保存修复（getFullColumns + 孪生表格 tableId）

## 背景意图

- 部分表格刷新后只剩 checkbox 列可见，UserSetting 中出现「26 列仅 1 列 true」的脏配置。
- 用户期望：列自定义面板调整后的**真实显隐**应完整写入 `columnVisibility` 并正确回放。

## 核心技术决策 / 逻辑变更

- 文件：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
- **根因**：vxe-table 4.17+ 的 `getColumns()` 仅返回 `visibleColumn`（当前可见列），原 `collectColumnConfigFromGrid` 用可见列集合反推全量显隐，隐藏列会被误写为 `false`。
- **修复**：
  - 显隐 / 固定 / 列宽：从 `getFullColumns()`（或 `getTableColumn().fullColumn`）采集真实运行时状态。
  - 可见列顺序：仍从 `getColumns()` 读取 `visibleColumnKeys`。
  - 增加「仅 checkbox 可见且其余全 false」的残缺配置拦截，避免继续污染远端。
- **孪生表格**：海运进出口费用表（应收/应付双表同页）补充独立 `gridOptions.id`，避免共用 `table_config_${route.name}` 互相覆盖。

## 避坑指南（Gotchas & Constraints）

- 持久化保存**禁止**仅用 `getColumns()` 推导全量 `columnVisibility`。
- 同一路由多表格必须配置不同 `gridOptions.id` 或 `columnPersist.tableId`。
- 已污染的 UserSetting 需用户在对应表格点击「恢复默认」或重新保存列配置以覆盖。
