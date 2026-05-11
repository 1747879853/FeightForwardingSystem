# sea-exports 列配置持久化调试日志增强

## 背景意图

- 当前问题表现为：接口已拉取列配置，但页面刷新后未正确应用。
- 为了精准定位是“key 不一致、配置解析失败、还是应用后被覆盖”，需要在持久化链路增加结构化日志。

## 核心技术决策 / 逻辑变更

- 在 `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue` 增加统一前缀日志：`[vxe-column-persist]`
  - 初始化阶段：输出 `resolvedTableId`、`userSettingKey`、本地回退 key、初始列摘要。
  - 远端加载阶段：输出 `remoteSetting`、解析结果、是否命中本地回退。
  - 应用阶段：输出应用前/后列摘要（`field/title/uniqueKey/visible`）。
  - 保存阶段：输出采集配置、add/edit 路径、成功/失败与回退。
- 在 `apps/web-antd/src/adapter/vxe-table.ts` 增加适配层前缀日志：`[vxe-column-persist-adapter]`
  - 输出 `preferredTableId`、最终注入 `tableId`。
  - 输出 `load` 请求入参与命中记录。

## 避坑指南（Gotchas & Constraints）

- 若日志中 `keyword` 与组件侧 `userSettingKey` 不一致，说明 tableId 生成链路仍存在分叉。
- 若远端配置存在但 `remoteConfig` 为空，优先检查 `setting` JSON 结构与 key 命名。
- 若“应用后列摘要”正确但界面仍错乱，需继续排查后续是否有二次 `setGridOptions` 覆盖列配置。
