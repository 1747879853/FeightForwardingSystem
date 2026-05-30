# vxe 表格配置改为登录后全局拉取并缓存

## 背景意图

- 现状是每个 `use-vxe-grid` 实例都会按 `table_config_${tableId}` 单独请求 `UserSettingAdmin/GetPagedListAsync`，页面多表格场景会产生重复请求。
- 目标是将“表格列配置”改为登录后全局预拉取一次，并放入统一 store 复用，减少重复 IO 与首屏抖动。

## 核心逻辑变更

- 新增全局 store：`src/store/table-config.ts`
  - 登录后按 `Keyword=table_config_` 拉取用户配置；
  - 首次固定 `PageSize=999` 拉第 1 页；若 `totalCount > 999`，再拉第 2 页并合并；
  - 将结果缓存为 `name -> UserSetting` 映射，供全局查询。
- 登录流程接入预热：`src/store/auth.ts`
  - 登录成功后触发 `loadTableConfigsOnce()`；
  - 失败不阻塞登录主流程，避免影响主链路可用性。
- 表格适配层切换到全局缓存：`src/adapter/vxe-table.ts`
  - `columnPersist.load` 不再逐表请求分页接口，改为查全局 store；
  - `columnPersist.add/edit/remove` 改为通过 store 封装调用，并同步更新全局缓存，确保新增/修改后全局可见。

## 避坑指南（Gotchas & Constraints）

- 当前全局缓存是运行时内存级缓存：同一次会话内复用，浏览器刷新后会重建并重新预拉取。
- 搜索表单配置 `search_form_config_` 已按同模式扩展，见 [搜索表单配置全局缓存](./change-log-2026-05-29-search-form-config-global-store-cache.md)。
- 分页补拉按需求只执行到第 2 页；若未来用户配置量可能远超 1998 条，需改为循环分页拉取直至取完。
