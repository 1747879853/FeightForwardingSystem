---
title: 监装列表默认预计到货倒序
date: 2026-09-20
module: sea-exports
---

# 背景意图

PC 监装列表和小程序师傅端列表原先不传或默认 `CreationTime DESC`。产品要求首屏按预计到货时间从近到远看。

# 核心逻辑变更

- PC：`createPagedListQuery` 的 `defaultSort` 改为 `EstimatedArrivalTime DESC`，列头高亮预计到货列。
- 小程序：`getMyLoadingOrders` 未显式传 `sorting` 时补同一字符串。后端 `PagingAndSorting` 基类默认仍是 `CreationTime DESC`，漏传会回到创建时间。

# 避坑指南

- 预计到货为空的行按数据库 NULL 排序，倒序时通常沉底。
- 点其它列头后会话排序会覆盖默认；清空列头排序才回到预计到货倒序。
