# 分页列表改为浅响应式

## 背景意图

虚拟滚动之后，海运出口 200 条仍要一秒多。vxe 灌数时会对整页 `reactive()`，委托单、服务项、港口这些嵌套对象会跟着被包进响应式。

## 核心逻辑变更

- `createPagedListQuery` 在 `afterFetch` 之后，把 `items` 里的每一行收成 `shallowReactive`。
- 行上的字段仍可替换并刷新（例如业务状态回写 `row.seaExportServices`）。嵌套对象内部的修改不会自动刷新格子。

## 避坑指南

- 不要在列表里改 `row.transportOrder.xxx` 这种嵌套字段指望格子自己更新。要更新就替换行上的字段，或重新查询。
- 没有 `items` 数组的返回值保持原样。
