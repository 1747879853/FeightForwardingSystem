# 海运出口编辑工作台：记住并恢复当前 Tab

**修改时间：** 2026-07-11

## 背景意图

编辑页 `/sea-exports/:id/edit` 未开启路由 `keepAlive`，从列表或其他页面再回到同一票编辑页时组件会重新挂载，`activeTab` 总是回到「基础信息」。业务人员常在费用、派车、分单等子 Tab 间跳转处理，希望离开后再进入仍停在离开前的标签。

## 核心逻辑变更（`src/views/sea-export-admin/editor.vue`）

1. **按委托 ID 持久化：** 切换 `activeTab` 时写入 `sessionStorage`，键为 `buildBrandStorageKey('sea-export-edit-active-tab:{id}')`，与品牌命名空间隔离。
2. **进入时恢复：** 初始化与 `editId` 变化时读取缓存；仅当值为合法 `TabKey` 时恢复，否则回退 `basic`。
3. **会话级作用域：** 使用 `sessionStorage`（非 `localStorage`），关闭浏览器标签后清空；不同委托 ID 互不影响。

## 避坑指南

- 编辑路由本身仍无 `keepAlive`；本方案只恢复「哪个 Tab」，不保留子页内部滚动/未保存草稿（子组件自身的 `KeepAlive include` 仅在同页内切 Tab 时生效）。
- 若后续新增顶部标签，须同步加入 `VALID_TAB_KEYS`，否则旧缓存中的非法 key 会被忽略并回退基础信息。
- `onSectionChange` 也会改写 `activeTab`（如滚动到表单分区），同样会写入记忆；与既有行为一致。
