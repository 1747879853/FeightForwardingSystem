# use-vxe-grid 列配置持久化接口未触发修复

## 背景意图

- 在 `http://localhost:5010/sea-exports` 页面调整列显隐/顺序后，控制台未出现 `UserSettingAdmin` 相关请求。
- 需要确保全局 `useVbenVxeGrid` 传入的 `columnPersist.load/add/edit/remove` 能在插件内部真正被消费，打通后端持久化链路。

## 核心技术决策 / 逻辑变更

- 根因定位：`use-vxe-grid.vue` 内部读取了 `props.columnPersist`，但业务侧 `useVbenVxeGrid(options)` 传入的是 store state，不会自动出现在组件 props 上。
- 修复方式：将持久化逻辑统一改为读取 `usePriorityValues(props, state)` 返回的 `columnPersist.value`，覆盖以下路径：
  - `resolvedTableId` 的 `tableId` 读取
  - `isColumnPersistEnabled` 的启用判断
  - `saveColumnConfig` 的 `add/edit/onError`
  - `loadColumnConfig` 的 `load/add/onError`
  - `resetColumnConfig` 的 `remove/onError`
- 保持原有回退策略不变：接口缺失或异常时仍写入本地 fallback key。

## 避坑指南（Gotchas & Constraints）

- 在该插件体系中，`options` 通常先进入 `api.store`，不要假设它会全部映射到 `props`。
- 只看页面是否配置了 `toolbarConfig.custom: true` 不够；若内部仍读 `props.columnPersist`，会出现“可操作列配置但无任何接口请求”的假象。
- 后续新增配置项时，优先走 `usePriorityValues(props, state)`，避免再次出现“配置已传入但运行时读取不到”的问题。
