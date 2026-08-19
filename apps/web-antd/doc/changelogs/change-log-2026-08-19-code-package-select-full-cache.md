---
title: 包装下拉改为全量缓存，删除后即时失效
module: 通用组件 / 基础资料 / 海运出口
author: auto-doc-sync
last_updated: 2026-08-19
---

# 背景意图

海运出口包装下拉原先走 `usePagedSelect` + TanStack Query（`queryKey: ['code-package']`，默认 5 分钟）。基础资料删除包装后只刷新维护列表，业务下拉仍能搜到已删项（TAPD #0821）。要求与 `UserSelect` 对齐：全量缓存、前端过滤。

# 核心逻辑变更

- 新增 `codePackageListCache`（`createBizSelectCache`）：`GetPagedListAsync` 以 `pageSize=1000` 翻页拼全量；`staleTime=0`，每次 `ensure()` 先用旧列表再静默刷新，成功才覆盖。
- `CodePackageSelect` 改为 `useCachedSelect`，直绑 `Select`；关键词按名称 / 描述 / EDI / AFR 前端过滤。已选项 pin，不在全量里的 id 仍走 `DetailAsync` 回显。
- 包装维护页新增、编辑、删除成功后 `ensure({ force: true })`，已打开的海出/海进/空出/分单下拉立刻去掉已删项。

# 避坑指南

- **不要**再给包装下拉加 TanStack `queryKey` 分页缓存；搜索已是本地过滤。
- 已选包装必须 pin：禁用项仍显示为 disabled，删除项从全量消失后靠 `selectedItems` / 详情回显，避免格子变成 id。
- 包装 id 是雪花，比较和详情请求用 `String()`，禁止 `Number(id)`。
