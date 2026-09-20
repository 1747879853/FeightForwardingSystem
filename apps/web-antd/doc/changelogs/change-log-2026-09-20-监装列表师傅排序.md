---
title: 监装列表按师傅排序
date: 2026-09-20
module: sea-exports
---

# 背景意图

后端 `8e7a0a89` 给管理端/师傅端列表补了 `sorting=LoadingOrderUsers.UserId`：按子表 `SortId` 最小那条师傅的用户 id 排，没有师傅视为空。前端列 `field` 仍是集合 `loadingOrderUsers`，点列头会打成 `LoadingOrderUsers`，一对多反射找不到属性。

# 核心逻辑变更

- 监装师傅列显式 `sortable`，`sortField` 固定为 `LoadingOrderUsers.UserId`。
- 列表 `fieldMap` 同步映射，避免会话排序只带列 field 时再转成集合路径。
- 展示仍拼接 `nickName`/`enName`；姓名与排序键拆开，后端不按第二名师傅排。

# 避坑指南

- 不要把列 `field` 改成 `loadingOrderUsers.userId`：行数据是数组，改 field 会导致列设置恢复后格子空。
- 远程环境需先部署含 `ListSortingCustomPaths` 的后端，否则该列排序仍会报找不到属性。
