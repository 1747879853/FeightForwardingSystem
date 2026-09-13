---
title: 编号规则列表分页改回 pageIndex/pageSize
date: 2026-09-13
module: basic-data
---

# 背景意图

编号规则列表翻页、改每页条数不生效：请求被转成 `skipCount` / `maxResultCount`，而后端 `GenerateNumQueryDto` 继承 `PagingAndSorting`，只认 `PageIndex` / `PageSize`。

# 核心逻辑变更

1. **列表查询：** `createPagedListQuery` 直接调用 `getGenerateNumPagedList`，不再把页码换算成 skip/take。
2. **类型：** `GetPagedListParams` 与后端一致，改为 `pageIndex` / `pageSize`。

# 避坑指南

- `Paging.GetSkipCount()` 在服务端由 `pageIndex`、`pageSize` 算出，前端不要自己传 `skipCount`。
- 同仓库其它基础资料列表已按 `pageIndex` / `pageSize` 对接，编号规则不要再单独包一层转换。
