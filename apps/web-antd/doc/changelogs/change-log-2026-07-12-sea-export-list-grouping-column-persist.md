# 海运出口列表开启分组后列设置被重置

## 背景意图

用户在海运出口列表自定义列显隐/顺序/列宽后，开启「分组设置」时列配置会瞬间恢复为默认，体验上等同于列设置被重置。

## 核心技术决策 / 逻辑变更

- 文件：`apps/web-antd/src/views/sea-export-admin/list.vue`
- **根因**：开启分组时同时发生两件事——`table-title` 从有值变为空字符串，且 `#toolbar-actions` 插槽由未挂载变为挂载。`use-vxe-grid` 的 `toolbarOptions` 依赖 `showTableTitle` 与插槽是否存在，会重算并 `cloneDeep` 整份 `gridOptions`（含 `columns`）下发给 `VxeGrid`，触发 vxe 重新应用列定义，覆盖已持久化的列设置。
- **修复**：工具栏左侧 `#toolbar-actions` 插槽始终挂载；未分组时展示列表标题，分组时展示 `GroupingTabs`。不再使用动态 `:table-title` 在「标题 prop」与「插槽挂载」之间切换，保持工具栏结构稳定。

## 避坑指南（Gotchas & Constraints）

- 需要「分组时隐藏标题、展示 Tab」的列表，应把标题与分组 Tab 都放进稳定的 `#toolbar-actions` 插槽内切换内容，避免 `table-title` prop 与插槽挂载态联动切换。
- 列持久化由 `use-vxe-grid` 统一管理；业务页工具栏结构变化若导致 `options` 重算，可能间接重置列配置。
