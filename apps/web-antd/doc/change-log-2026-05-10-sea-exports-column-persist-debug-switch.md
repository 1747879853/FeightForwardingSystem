# sea-exports 列持久化调试日志开关化

## 背景意图

- 当前列持久化排障已完成，临时日志需改为可控输出，避免默认污染控制台。

## 核心技术决策 / 逻辑变更

- 修改 `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
  - `debugLog` 新增本地开关判断，默认关闭。
- 修改 `apps/web-antd/src/adapter/vxe-table.ts`
  - 适配层日志统一改为 `debugLog`，并绑定同一开关。
- 开关约定：
  - `localStorage.__debug_vxe_persist = '1'` 或 `'true'` 时打印；
  - 未设置时不打印（默认行为）。

## 避坑指南（Gotchas & Constraints）

- 不建议线上长期开启该开关，会产生较多控制台输出。
- 排障完成后可执行 `localStorage.removeItem('__debug_vxe_persist')` 关闭日志。
