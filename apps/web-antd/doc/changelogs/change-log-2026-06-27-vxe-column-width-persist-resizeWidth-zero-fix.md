# 列宽持久化 resizeWidth 为 0 导致不生效修复

## 基本信息

- 日期：2026-06-27
- 范围：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
- 现象：用户拖拽列宽后刷新，宽度未恢复；`UserSetting` 中 `columnWidths` 字段缺失

## 根因

vxe-table 在未手动拖宽时，运行时列的 `resizeWidth` 默认为 `0`（非 `null/undefined`）。

原实现使用：

```ts
column?.resizeWidth ?? column?.renderWidth ?? column?.width;
```

`0 ?? renderWidth` 结果为 `0`，随后 `resolveNumericWidth(0)` 判为无效并返回 `undefined`，**永远不会回退到 `renderWidth`**。

连锁影响：

1. **基线采集失败**：无默认 `width` 的列无法记录 `baselineWidth`
2. **稀疏比较失败**：`isColumnWidthChanged(runtime, undefined)` 恒为 `false`
3. **保存跳过**：`columnWidths` 不写入 JSON，刷新后宽度丢失

## 修复

```ts
function resolveRuntimeColumnWidth(column: any): number | undefined {
  const resizeWidth = resolveNumericWidth(column?.resizeWidth);
  if (resizeWidth !== undefined) {
    return resizeWidth;
  }
  return resolveNumericWidth(column?.renderWidth ?? column?.width);
}
```

仅当 `resizeWidth` 为有效正数时才采用，否则回退 `renderWidth` / `width`。

## 验证

- 海运出口列表 `/sea-exports`：拖宽「应收费用状态」→ 保存日志含 `"columnWidths":{"col_43_receiveFeeStatus":210}`
- 刷新后该列宽度保持 210px
