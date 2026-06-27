# useVbenVxeGrid 列宽调整持久化

## 基本信息

- 日期：2026-06-27
- 范围：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
- 目标：在既有列显隐/顺序/固定持久化基础上，支持用户拖拽列宽后的按用户、按表格持久化

## 背景意图

全局 vxe 表格已开启 `columnConfig.resizable: true`，用户可拖拽调整列宽，但刷新后宽度会丢失。列宽应作为列设置的一部分，与显隐、顺序、固定共用同一条 `UserSetting` 记录。

## 核心逻辑变更

### 1. 扩展列配置协议

在 `ColumnPersistConfig` 中新增可选字段：

```json
{
  "visibleColumnKeys": [],
  "columnVisibility": {},
  "columnFixed": {},
  "columnWidths": {
    "col_0_orderNo": 180
  }
}
```

- `columnWidths` 为**稀疏存储**：仅保存与默认值差超过 1px 的列
- 存储 key 仍为稳定 `col_${index}_${field|title|type}`

### 2. 采集与回填

- **采集**：`resizeWidth ?? renderWidth ?? width`，与基线比较后写入
- **回填**：写 `column.width`；不再受列定义 `minWidth` 钳制
- **基线**：`originalColumns.width`（列定义默认宽）优先；无默认宽时在列配置加载完成后采一次 `renderWidth`

### 3. 保存触发

- 监听 `columnResizableChange`，复用 `scheduleSaveColumnConfig()`（120ms 防抖）
- 生效范围与现有列配置持久化一致（`toolbarConfig.custom` 或 `columnPersist.enabled`）

### 4. 重置与兼容

- `customReset` 时恢复 `originalColumns` 默认 `width`，并清空 `columnWidths`
- 旧配置无 `columnWidths` 时行为不变
- apply 忽略无效 key；save 时剔除当前列集合中不存在的 key

## 避坑指南

- 无默认 `width` 的列，基线必须在 `loadColumnConfig` + `refreshColumn` 之后采集，否则会把持久化宽度误当作基线前的布局宽
- **vxe 未拖拽时 `resizeWidth` 为 `0`**：不能用 `resizeWidth ?? renderWidth` 链式取值，`0` 会阻断回退到 `renderWidth`，导致基线采集失败、`columnWidths` 永远不写入（2026-06-27 已修复）
- **列定义 `minWidth` 会限制拖拽收窄**：仅设 `resizableConfig.minWidth` 不足以覆盖各列 `minWidth`（如付费申请「申请单号」`minWidth: 160`）；须在列初始化时将 `minWidth` 转为初始 `width` 后移除 `minWidth`
- 动态换列页面（运行时 `setGridOptions({ columns })`）v1 不在换列后自动套宽度，需用户重新拖拽
- 调试可设 `localStorage.__debug_vxe_persist = '1'` 查看 `[vxe-column-persist]` 日志
