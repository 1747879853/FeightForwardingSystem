# 海运进出口列表取消默认会计期间并按开船日期降序

## 背景意图

海运出口、海运进口列表进入时默认带当月会计期间，首屏只看到当月票，跨月委托要先清条件。业务希望进列表看全量数据，并按开船日期（运输单 `ETD`）从新到旧排列。

## 核心逻辑变更

- 文件：`src/views/sea-export-admin/list.vue`、`src/views/sea-import-admin/list.vue`（schema 注释在各自 `data.ts`）
- **去掉默认会计期间：** 删除 `applyDefaultAccountDate`、`accountDateDefaultApplied` 以及 `normalizeQuery` 对空期间的当月兜底。会计期间仍可手工筛选；未选则不传 `AccountDateStart` / `AccountDateEnd`。
- **默认排序：** `createPagedListQuery` 的 `defaultSort` 由 `CreationTime DESC` 改为 `TransportOrder.Etd DESC`。`parseAbpSorting` 会把 `Etd` 还原成列字段 `transportOrder.etd`，列头箭头才能落在开船/到港日期列。
- **排序映射：** 出口 `fieldMap`、进口 `SEA_IMPORT_SORT_FIELD_MAP` 增加 `'transportOrder.etd' → 'TransportOrder.ETD'`，列头点击与默认排序都走实体 `ETD`。
- **首查时序不变：** 仍 `autoLoad: false`，`onMounted` 先 `restorePersistedField()` 再 `submitForm()`，只是不再写入会计期间。
- **列头降序箭头：** 列设置加载会 `refreshColumn`，vxe 的 `handleDefaultSort` 只跑一次，箭头会被冲掉。`use-vxe-grid.vue` 在列刷新后按 `sortConfig.defaultSort` 补 `setSort(..., false)`。

进口列表列标题是「到港日期」，字段仍是 `transportOrder.etd`，与出口「开船日期」同一排序路径。

## 避坑指南

- 默认排序字符串必须写成 `TransportOrder.Etd DESC`，不要写成 `TransportOrder.ETD DESC`：后者经 `parseAbpSorting` 会变成 `transportOrder.eTD`，列头箭头对不上 `transportOrder.etd`。
- 发给后端的路径由 `fieldMap` 映射为 `TransportOrder.ETD`；不要依赖 Dynamic LINQ 大小写不敏感当唯一保障。
- 以前默认 `CreationTime DESC` 时，创建时间列多半在很右边或未注意，看起来像「列头本来就没箭头」。改到开船日期后才暴露列持久化冲掉 `column.order` 的问题。
- Vite HMR 不重跑 `onMounted`，验证默认条件/排序需硬刷新。
- 空运出口列表仍默认当月会计期间，本次未改。
