# 2026-08-23 KeepAlive 编辑页冻结路由 id

## 背景意图

海进、海出、空出编辑页都开了 KeepAlive，又都从全局 `route.params.id` 取单号。从一页切到另一页时，藏起来的那一页仍会盯着新地址栏的 id，用错的业务接口去拉详情。典型现象：打开 `/sea-exports/:id/edit`，Network 里出现 `SeaImportAdmin/DetailAsync`。

## 核心逻辑变更

- 新增 `useKeepAliveRouteParamId`：本页可见时同步 `params.id`，`onDeactivated` 后冻结上次的值，回到本页再同步。
- 海进 / 海出 / 空出编辑工作台及各自费用、附件等从路由取 id 的位置改为走该 composable。
- 费用提交页 `submission-order-fee-table` 的 `params.id` 是提交单 id，不是业务编辑页，未改。

## 避坑指南

- 不要在 KeepAlive 页面里直接 `watch(() => route.params.id)` 去拉详情；先判断组件是否还是当前页。
- 海进 / 海出 / 空出路由参数都叫 `:id`，缓存页串单是同类问题，三边已用同一 composable。
- 业务联系单内嵌海出编辑页时，子组件会随父页 `onDeactivated` 一起冻结，不会在切走后误跟其它 `:id`。
