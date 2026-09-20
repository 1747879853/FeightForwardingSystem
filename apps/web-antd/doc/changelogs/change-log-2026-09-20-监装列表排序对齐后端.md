---
title: 监装列表排序对齐后端
date: 2026-09-20
module: sea-exports
---

# 背景意图

`GetPagedListAsync` 的 `sorting` 只认 `LoadingOrder` 实体属性、海出/堆场导航，以及 `ListSortingCustomPaths` 里的 `LoadingOrderUsers.UserId`。列表套了 `applyDefaultSortable`，没写 `sortable: false` 的列都能点，品名和派单人会打出后端不认的路径。

# 核心逻辑变更

- 能反射或走 customPaths 的列显式可排序，并写 `sortField` / `LOADING_ORDER_SORT_FIELD_MAP`：工单号、状态、主提单号、船名、船公司简称、主单件数、预计到货、堆场名、师傅 UserId、备注、提交/认领/完成/创建时间。
- 品名（一对多集合）和派单人（DTO 昵称，实体只有 `SubmitUserId`）关闭排序。
- 不新增明细包装列；后端虽支持 `CodePackageItem.Name`，当前列表没有该列。

# 避坑指南

- 船名航次展示拼接航次，排序只传 `SeaExport.Vessel`。
- 船公司展示有全称/代码回退，排序只传 `SeaExport.Carrier.CnShortName`。
- 师傅列按先输入师傅的用户 id，不是姓名。
