# 同路由多表补齐列持久化独立 id

## 背景意图

`useVbenVxeGrid` 列/搜索持久化依赖 `columnPersist.tableId`（优先取自 `gridOptions.id`）。未配置时回退为当前路由 `name/path`。同一路由挂多个表格时会共用同一 key，列配置互相覆盖。

## 核心逻辑变更

- 权限管理页（`/system/permission`）三个列表补独立 id：
  - 数据权限：`systemPermissionDataList`
  - 表级权限：`systemPermissionTableList`
  - 字段权限：`systemPermissionPropList`
- 收费核销页（`/settlement-management/receive-settlement`）两个 Tab 列表补独立 id：
  - 银行流水 Tab：`settlementBankStatementList`
  - 收费核销 Tab：`settlementReceiveSettlementList`

## 避坑指南

- 同一路由下出现 ≥2 个 `useVbenVxeGrid` 时，必须显式配置 `gridOptions.id`（或 `columnPersist.tableId`），不要依赖路由回退。
- `rowConfig.keyField: 'id'` 只是行主键，与列持久化表格 id 无关。
