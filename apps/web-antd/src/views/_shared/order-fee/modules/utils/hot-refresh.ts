/**
 * Handsontable 局部刷新：选中 / 预警高亮避免动辄整表 render。
 */

import { applyHotCellChrome } from './hot-cell-render';

/**
 * 预警高亮：用 class 切换（与 afterRenderer 一致），不再写内联 !important。
 */
export function applyHotWarningHighlightClasses(
  hot: any,
  dataSource: any[],
  highlightIds: Iterable<string>,
) {
  if (!hot || hot.isDestroyed) return;
  const idSet =
    highlightIds instanceof Set ? highlightIds : new Set(highlightIds);
  const rowCount = hot.countRows();
  const colCount = hot.countCols();

  for (let visual = 0; visual < rowCount; visual++) {
    const physical = hot.toPhysicalRow(visual);
    if (typeof physical !== 'number' || physical < 0) continue;
    const row = dataSource[physical];
    const on = !!(row?.id && idSet.has(String(row.id)));
    const statusValue = row?.combinedFeeStatus ?? row?.feeStatus;

    for (let col = 0; col < colCount; col++) {
      const td = hot.getCell(visual, col, true);
      if (!td) continue;
      applyHotCellChrome(td, {
        warning: on,
        statusValue:
          statusValue === null || statusValue === undefined
            ? null
            : Number(statusValue),
      });
    }
  }
}

/**
 * 仅刷新指定 visual 行；行过多时退回整表 render。
 * Handsontable 无稳定的公开 renderRow API，这里用逐格 forceFullRender 元信息触发重绘单元格。
 */
export function refreshHotVisualRows(
  hot: any,
  visualRows: number[],
  options?: { fullRenderThreshold?: number },
) {
  if (!hot || hot.isDestroyed) return;
  const threshold = options?.fullRenderThreshold ?? 24;
  const rowCount = hot.countRows();
  const unique = [
    ...new Set(
      visualRows.filter((r) => typeof r === 'number' && r >= 0 && r < rowCount),
    ),
  ];

  if (unique.length === 0) return;
  if (unique.length > threshold) {
    hot.render();
    return;
  }

  const colCount = hot.countCols();
  for (const visual of unique) {
    for (let col = 0; col < colCount; col++) {
      // 读 meta + 写回同 renderer 会标记脏格；再 render 单行范围代价仍高，故用 getCell 强制取 TD 后触发 afterRenderer
      const value = hot.getDataAtCell(visual, col);
      const td = hot.getCell(visual, col, true);
      if (!td) continue;
      const cellMeta = hot.getCellMeta(visual, col);
      const renderer = cellMeta?.renderer;
      if (typeof renderer === 'function') {
        renderer.call(
          hot,
          hot,
          td,
          visual,
          col,
          cellMeta.prop,
          value,
          cellMeta,
        );
      }
      // 联动改脏行后需重跑 afterRenderer（状态底色、编辑标记、预警）
      if (typeof hot.runHooks === 'function') {
        hot.runHooks(
          'afterRenderer',
          td,
          visual,
          col,
          cellMeta.prop,
          value,
          cellMeta,
        );
      }
    }
  }
}

/**
 * 按 dataSource 物理行下标刷新（先 toVisualRow）；过滤隐藏时退回整表 render。
 */
export function refreshHotSourceRows(
  hot: any,
  sourceRows: number[],
  options?: { fullRenderThreshold?: number },
) {
  if (!hot || hot.isDestroyed) return;
  const visualRows: number[] = [];
  for (const physical of sourceRows) {
    if (typeof physical !== 'number' || physical < 0) continue;
    const visual =
      typeof hot.toVisualRow === 'function'
        ? hot.toVisualRow(physical)
        : physical;
    if (typeof visual === 'number' && visual >= 0) {
      visualRows.push(visual);
    }
  }
  if (visualRows.length === 0) {
    if (sourceRows.length > 0) hot.render();
    return;
  }
  refreshHotVisualRows(hot, visualRows, options);
}

/** 根据选中 key 变化，算出需要刷新的 visual 行 */
export function resolveVisualRowsForSelectionChange(
  hot: any,
  dataSource: any[],
  prevKeys: Iterable<string | number>,
  nextKeys: Iterable<string | number>,
): number[] {
  if (!hot || hot.isDestroyed) return [];
  const prev = new Set([...prevKeys].map(String));
  const next = new Set([...nextKeys].map(String));
  const changedKeys = new Set<string>();
  for (const k of prev) {
    if (!next.has(k)) changedKeys.add(k);
  }
  for (const k of next) {
    if (!prev.has(k)) changedKeys.add(k);
  }
  if (changedKeys.size === 0) return [];

  const visualRows: number[] = [];
  const rowCount = hot.countRows();
  for (let visual = 0; visual < rowCount; visual++) {
    const physical = hot.toPhysicalRow(visual);
    if (typeof physical !== 'number' || physical < 0) continue;
    const row = dataSource[physical];
    const key = row?._rowKey != null ? String(row._rowKey) : '';
    if (key && changedKeys.has(key)) {
      visualRows.push(visual);
    }
  }
  return visualRows;
}
