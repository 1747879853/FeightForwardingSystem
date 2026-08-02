# NestedDataTable 去掉 table min-width max-content

## 背景意图

- `table-layout: fixed` 下再设 `min-width: max-content` 易把表格撑出容器，出现不必要的横向滚动或列宽失控。

## 核心逻辑变更

- `src/components/nested-data-table/nested-data-table.vue`：移除 `.nested-data-table table` 的 `min-width: max-content`，保留 `width: 100%` 与 `table-layout: fixed`，列宽按容器分配。

## 避坑指南

- 若某列内容过长，应依赖列宽配置/`columnClass` 截断或省略号，而不是靠 `max-content` 撑开整表。
