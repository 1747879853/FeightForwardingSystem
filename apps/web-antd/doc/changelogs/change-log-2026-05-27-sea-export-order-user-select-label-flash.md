# 海运出口新建：干系人下拉选中后先显示数字 ID

## 背景意图

新建页 `/sea-exports/create` 右侧「干系人」面板中，用户通过 `UserSelect` 选择人员后，下拉框会先短暂显示数字（用户 ID），随后才切换为昵称/姓名，体验上像「闪一下 ID」。

## 核心逻辑变更

1. **根因**（`src/views/sea-export-admin/form.vue`）
   - 干系人行的 `UserSelect` 使用了动态 `:key`，包含 `row._rowKey`、`userId` 与 `getOrderUserDisplayName(row)`。
   - 用户选中人员后，`userId` 立即写入行数据，而显示名需经 `loadOrderUserDetail` 异步补齐。
   - `key` 变化触发组件销毁并重建；重建瞬间 `selectedItems` 尚无有效 `nickName`，Ant Design `Select` 在 options 未就绪时只能回显 `value`（数字 ID）。
   - 异步详情返回后 `orderUserNameMap` 更新、`selectedItems` 补齐，`key` 再次变化，组件再次重建，最终才显示名称。

2. **修复**
   - 将 `UserSelect` 的 `:key` 改为仅使用稳定的 `row._rowKey`，同一干系人行不因选中值或名称变化而重建。
   - 选中后通过已有的 `selectedItems` 与 `loadOrderUserDetail` 异步更新 label，由 `usePagedSelect` 合并选项，无需靠 `key` 强制刷新。

## 避坑指南

- **分页业务下拉 + 异步回显**：不要用「值 + 显示名」拼进 `key` 来触发刷新；应依赖 `selectedItems` / `mergeSelectedItems` 或组件内 `ensureSelectedLoaded`（参考 `ClientSelect`）。
- **Vue `key` 使用**：`key` 变化等于卸载再挂载，会丢失组件内部 options 缓存，Remote Select 极易出现「先显示 value 再显示 label」。
- **排查方式**：选中瞬间观察 DOM 是否发生组件 remount（Vue DevTools 或临时 log `onMounted`）；若 remount 与 ID 闪烁同步，优先检查 `:key` 是否绑定了会随选中变化的字段。
