# useVbenVxeGrid 搜索字段显示持久化改造

## 背景意图

- 当前 `useVbenVxeGrid` 仅支持“列设置”持久化，搜索表单字段显隐无法按用户习惯保存。
- 需要在保持原有列持久化稳定的前提下，新增“搜索字段显示/隐藏可配置 + 持久化”能力，并提供可视化入口。

## 核心技术决策 / 逻辑变更

- 在 `packages/effects/plugins/src/vxe-table/types.ts` 新增 `searchPersist` 配置（结构对齐 `columnPersist`），形成统一持久化扩展点。
- 在 `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue` 新增搜索字段持久化流程：
  - 以 `formOptions.schema[].fieldName` 作为稳定 key；
  - 初始化加载远端配置，失败或缺失时回退 localStorage；
  - 通过 `formApi.updateSchema([{ fieldName, hide }])` 实时应用字段显隐；
  - 提供节流保存与默认恢复逻辑。
- 在工具栏新增“搜索项设置”弹层入口，支持：
  - 勾选显示/隐藏单个搜索字段；
  - 一键全选；
  - 恢复默认显示规则。
- 在 `apps/web-antd/src/adapter/vxe-table.ts` 注入 `searchPersist` 默认后端 API，对接现有 `UserSettingAdmin`，并使用独立 key：`search_form_config_${tableId}`。

## 避坑指南（Gotchas & Constraints）

- 搜索字段持久化 key 需与列持久化完全隔离，避免互相覆盖配置。
- 搜索 schema 中的“内部隐藏项”（如 `hide: true` 或 `formItemClass` 含 `hidden`）不应进入可配置清单。
- `tableId` 解析优先级需覆盖 `columnPersist.tableId`、`searchPersist.tableId`、`gridOptions.id`，避免不同页面出现配置串用。
