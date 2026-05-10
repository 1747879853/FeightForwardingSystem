# sea-exports 列配置保存后刷新未生效修复

## 背景意图

- 在 `http://localhost:5010/sea-exports` 页面修改列表列配置后，后端已触发保存请求，但刷新页面后列配置仍恢复默认。
- 目标是确保“保存使用的配置键”与“加载使用的配置键”保持稳定一致。

## 核心技术决策 / 逻辑变更

- 根因定位在 `use-vxe-grid.vue` 的 `resolvedTableId` 计算顺序：
  - 之前优先读取 `gridOptions.id`，该值在运行时可能是内部生成或非稳定值。
  - 导致保存与加载阶段命中的 `table_config_${tableId}` 不一致。
- 修复策略：
  - 将优先级调整为 `columnPersist.tableId` > `gridOptions.id`。
  - 业务层 `useVbenVxeGrid` 已注入稳定 `tableId`（来自业务声明/路由兜底），因此可保证同一页面键值稳定。

## 避坑指南（Gotchas & Constraints）

- 列持久化场景下，不要默认把 `gridOptions.id` 当成稳定业务标识，尤其当表格库可能注入运行时 id 时。
- 建议始终由业务侧显式传入或统一注入 `columnPersist.tableId`，把它作为唯一持久化键来源。
- 若后续新增多实例同页表格，应确保 `columnPersist.tableId` 对每个实例唯一，避免配置串扰。
