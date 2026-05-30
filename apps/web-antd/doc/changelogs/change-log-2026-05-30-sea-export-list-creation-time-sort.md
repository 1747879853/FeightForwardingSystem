# 海运出口列表默认按创建时间倒序

## 背景意图

业务人员在 `/sea-exports` 列表中需要优先看到最近新建的委托单。此前分页查询未显式传入排序参数，列表顺序依赖后端默认规则，与业务预期不一致。

## 核心逻辑变更

- 在 `src/views/sea-export-admin/list.vue` 的 `getSeaExportPagedList` 调用中固定传入 `Sorting: 'CreationTime DESC'`。
- 参数与 `SeaExportAdminApi.GetPagedListParams.Sorting` 字段对齐，随 `PageIndex`、`PageSize` 及查询区条件一并提交至 `GetPagedListAsync`。

## 避坑指南

1. **参数名大小写**：接口类型定义为 PascalCase `Sorting`，与项目中其他分页列表（如更改单、运价）保持一致，勿混用 camelCase `sorting` 除非对应 API 已明确兼容。
2. **与查询条件合并顺序**：`Sorting` 写在 `...query` 之前，避免查询表单未来若支持排序字段时被意外覆盖；当前查询 schema 未暴露排序项。
3. **表格列排序**：本次仅固定服务端默认排序，未开启 vxe-table 列头本地排序；若后续需列头联动，需单独对接 `sortConfig` 与 `Sorting` 参数映射。
