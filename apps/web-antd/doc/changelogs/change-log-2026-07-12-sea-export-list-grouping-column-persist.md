# 海运出口列表开启/切换分组后列设置被重置

## 背景意图

用户在海运出口列表自定义列显隐/顺序/列宽后，开启「分组设置」或**切换分组维度**时，列配置会瞬间恢复为默认，体验上等同于列设置被重置。

## 核心技术决策 / 逻辑变更

### 表层触发（`apps/web-antd/src/views/sea-export-admin/list.vue`）

- 开启分组时 `table-title` 由有值变空、`#toolbar-actions` 插槽由未挂载变挂载，会触发工具栏结构变化。
- 改为 `#toolbar-actions` 插槽**始终挂载**：未分组显示列表标题，分组显示 `GroupingTabs`，不再用动态 `:table-title` 在「标题 prop」与「插槽挂载」间切换。

### 根因（`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`）

- `toolbarOptions` 计算属性内部会**调用** `#toolbar-actions` 插槽渲染函数以判断是否有内容；而该插槽里的 `GroupingTabs` 读取了 `grouping.loading / groupItems / selectedItemId` 等响应式状态。
- 切换分组维度时这些状态变化（loading 切换、items 重取、选中项重置）→ `toolbarOptions` 重算 → `options` 重算 → `cloneDeep` 出一份**新的 `columns` 数组引用**通过 `v-bind` 传给 `VxeGrid`。
- vxe 检测到 `columns` prop 引用变化即 `reloadColumn`，而用户运行时的显隐/顺序/列宽从未写回 `gridOptions.columns`，于是被重置为已加载（或默认）状态。

### 修复：保持下发 columns 引用稳定

- 新增 `getBoundColumnsSignature()`：按叶子列的 `field/title/type/visible/fixed/width` 生成定义签名。
- 在 `options` 计算属性末尾：签名不变时复用上一次的 `columns` 数组引用（`stableBoundColumns`），签名变化时才更新缓存并下发新数组。
- 效果：与列无关的重算（工具栏/分组 Tab 状态变化）不再改变 `columns` 引用，vxe 不再 `reloadColumn`，用户运行时列设置得以保留；真正的列变化（加载持久化配置、恢复默认、动态换列）签名改变仍会正常下发。

## 避坑指南（Gotchas & Constraints）

- 插件层修复为通用能力，所有使用 `useVbenVxeGrid` 且开启列持久化的列表都受益。
- 运行时用户列改动不会写回 `gridOptions.columns`；判断「列是否需要重新下发」以 `getBoundColumnsSignature` 的定义签名为准，签名未纳入的字段（如 slot/render 名）变化不会触发重载。
- 工具栏插槽读取响应式状态是安全的，但要意识到它会进入 `toolbarOptions → options` 的依赖链；列引用稳定化即为此设计。
