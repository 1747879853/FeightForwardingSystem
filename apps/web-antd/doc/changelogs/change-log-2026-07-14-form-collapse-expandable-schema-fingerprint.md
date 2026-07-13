# 可折叠搜索表单在持久化重排后按新布局重算保留项

## 背景意图

海运出口列表（`/sea-exports`）顶部搜索区在折叠态下，第一行 `grid-cols-6` 仅显示 3 个搜索项 + 按钮组，右侧仍空 2 列。用户已保存的 `search_form_config_SeaExportList` 中全部字段均为可见，问题并非字段被隐藏。

根因是折叠保留数（`keepFormItemIndex`）在表单首次挂载时按**代码默认 schema 顺序**完成 DOM 测量；随后异步加载的搜索项持久化配置会**在不改变 schema 长度的情况下重排字段**（例如将 `ETDRange`、`AccountDateRange` 等 `col-span-2` 宽字段挪到队尾）。`expandable.ts` 原先仅 `watch` `schema.length`，重排后不触发重新测量，导致保留数停留在旧布局（第一行曾排下 4 项 → `keepIndex = 3`），与新顺序（头部多为单列字段）错位。

## 核心逻辑变更

- 文件：`packages/@core/ui-kit/form-ui/src/form-render/expandable.ts`
- 将折叠重算的 watch 依赖由 `props.schema?.length` 改为「字段顺序 + 显隐」指纹：
  - `schema.map(item => \`${fieldName}:${hide ? 0 : 1}\`).join(',')`
- 当搜索项持久化重排或显隐字段后，指纹变化 → `calculateRowMapping()` 重新测量 → `keepFormItemIndex` 按当前 DOM 布局更新。

## 避坑指南

1. **折叠显示个数不是写死数字**：`keepIndex = 前 N 行实际排下的项数 - 1`（为查询/重置/展开按钮留格），受 `wrapperClass`（如 `grid-cols-6`）、各字段 `formItemClass`（如 `col-span-2`）、窗口断点共同影响。
2. **持久化重排与折叠测量存在时序竞态**：任何会改变「首行能放下几个」但不改 schema 长度的操作（重排、显隐），都必须让 `useExpandable` 能感知并重新测量，不能只看 `length`。
3. **验证方式**：硬刷新进入带 `searchPersist` 的列表页，折叠态第一行应尽可能填满网格列（扣除按钮占位），不应出现「项少、列空」的错位留白。

## 影响面

- 所有使用 `showCollapseButton: true` 且启用 `searchPersist` 的 VXE 列表搜索表单。
- 典型页面：海运出口列表 `/sea-exports`（`SeaExportList`）。
