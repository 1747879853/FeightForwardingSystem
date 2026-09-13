---
title: 海出派车列表分页改回 pageIndex/pageSize
date: 2026-09-13
module: sea-exports
---

# 背景意图

编号规则分页修完后全仓库复查：业务列表入参应统一走 `PagingAndSorting` 的 `pageIndex` / `pageSize`。海出派车仍把页码换成 `skipCount` / `maxResultCount`，后端绑不上。

# 核心逻辑变更

1. **派车列表：** `getDispatchPagedList` 改为传 `pageIndex`、`pageSize`。
2. **类型：** `GetPagedListParams` 与 `SeaExportDispatchQueryDto` 对齐。

# 避坑指南

- 全仓库复查后，其它列表已由 `createPagedListQuery` 发 `pageIndex` / `pageSize`，没有第二处请求换算。
- 接口类型里的 `skipCount` / `maxResultCount` 多数是 **响应** `PagedList` 字段，不要改成入参。
