# 收费结算页双列表持久化 tableId 分离

## 背景意图

收费结算页含「收费结算」「银行流水」两个 Tab 列表，此前均未显式声明 `columnPersist.tableId`，适配器均回落到路由名 `ReceiveSettlementList`，导致列配置、搜索项配置与排序会话互相覆盖。

## 核心逻辑变更

- `receive-settlement-grid.vue`：显式 `columnPersist: { tableId: 'ReceiveSettlementList' }`。
- `bank-statement-grid.vue`：显式 `columnPersist: { tableId: 'BankStatementList' }`，与独立 `/bank-statement` 列表及 `list-refresh-flag` 键名对齐。

## 避坑指南

- 同一路由内挂载多个 `useVbenVxeGrid` 实例时，必须为每个实例指定唯一 `columnPersist.tableId`，不可依赖路由名兜底。
- 银行流水 Tab 与 Admin 银行流水页共用列定义（`views/bank-statement/data.ts`），故复用 `BankStatementList` 作为持久化键，用户在两处调整的列/搜索项配置可互通。
