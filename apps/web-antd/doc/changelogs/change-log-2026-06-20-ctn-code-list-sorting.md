# 箱型代码列表默认排序

## 背景意图

`/basic-data/ctn-code` 列表及所有复用 `getCtnCodePagedList` 的下拉/弹窗，需按后端约定以 `OrderNo ASC, Id DESC` 排序，保证展示顺序与业务排序号一致。

## 核心逻辑变更

- `getCtnCodePagedList` 在未传入 `Sorting` 时，默认携带 `OrderNo ASC, Id DESC`（多字段用逗号分隔）。
- 调用方仍可显式传入 `Sorting` 覆盖默认行为。

## 避坑指南

- 排序参数写在 API 封装层，避免各页面/组件重复配置。
- 字段名使用 PascalCase `Sorting`，与 ABP 分页接口一致。
