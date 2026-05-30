# 搜索表单配置改为登录后全局拉取并缓存

## 背景意图

- 现状是每个 `use-vxe-grid` 实例都会按 `search_form_config_${tableId}` 单独请求 `UserSettingAdmin/GetPagedListAsync`（`PageSize=1`），与列配置改造前的问题相同。
- 目标是将搜索区字段显隐/顺序配置与 `table_config_` 对齐：登录后全局预拉取一次，放入统一 store 复用。

## 核心逻辑变更

- 扩展全局 store：`src/store/table-config.ts`
  - 新增 `searchFormConfigMap` 与 `search_form_config_` 前缀过滤；
  - `loadSearchFormConfigsOnce()`：`PageSize=999` 拉第 1 页，`totalCount > 999` 时再拉第 2 页并合并；
  - 提供 `getSearchFormConfigByName`、`addSearchFormConfig`、`editSearchFormConfig`、`removeSearchFormConfig`，增删改后同步更新内存缓存。
- 登录流程：`src/store/auth.ts`
  - 登录成功后并行调用 `loadTableConfigsOnce()` 与 `loadSearchFormConfigsOnce()`。
- 表格适配层：`src/adapter/vxe-table.ts`
  - `searchPersist.load/add/edit/remove` 全部改为走全局 store，不再逐表 `GetPagedListAsync`。

## 避坑指南（Gotchas & Constraints）

- 与列配置相同，当前为会话级内存缓存；浏览器刷新后会重新预拉取。
- `table_config_` 与 `search_form_config_` 分两张 map 管理，互不覆盖；删除单条配置时会按 id 从两侧 map 一并移除，避免残留。
- 分页补拉仍只到第 2 页；配置量极大时需改为循环分页。
