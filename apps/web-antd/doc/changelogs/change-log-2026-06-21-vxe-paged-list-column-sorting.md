# 全站 vxe 分页列表列头远程排序

## 背景意图

业务需要在各分页列表中通过列头点击进行服务端排序，并与后端 ABP `sorting` 参数对齐。此前多数列表仅固定默认排序或未传排序参数，列头不可交互。

## 核心逻辑变更

- 新增 `createPagedListQuery` / `buildAbpSorting`（`src/utils/paged-list-query.ts`）及 `sort-session` 内存会话（`src/store/sort-session.ts`）。
- 增强 `useVbenVxeGrid`（`src/adapter/vxe-table.ts`）：检测 `createPagedListQuery` 后自动开启远程排序、列默认可排、多列叠加（无需 Shift）、会话恢复与 `sort-change` 自定义逻辑。
- 约 41 个分页列表页 `query` 改为 `createPagedListQuery(apiFn, options)`，统一输出 `pageIndex` / `pageSize` / `sorting`（camelCase，后端双兼容）。
- 海运出口 `receiveFeeStatus` / `payFeeStatus` 列显式 `sortable: false`（后端聚合字段不可排）。

## 避坑指南

1. **仅分页列表接入**：`pagerConfig.enabled === false` 的表格（菜单、订单费用子表等）不会注入远程排序。
2. **计算/聚合列**：需在列配置写 `sortable: false` 或 `sortField` 覆盖，否则可能触发 500 并回退 `defaultSort`。
3. **defaultSort**：有业务默认序的页面应在 `createPagedListQuery` 传 `defaultSort`（如海运出口 `CreationTime DESC`、箱型 `OrderNo ASC, Id DESC`）。
4. **mapParams / afterFetch**：查询区转换与结果 enrich 分别用选项，勿在 query 内手写分页排序参数。
