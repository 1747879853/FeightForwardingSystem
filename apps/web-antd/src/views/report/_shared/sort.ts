/**
 * 报表列头排序纯函数（与 Handsontable 解耦，便于单测）。
 * 约定：升序 → 降序 → 取消；空值在升序末尾、降序开头。
 */

export type ReportSortOrder = 'asc' | 'desc';

export type ReportSortState = {
  column: string;
  order: ReportSortOrder;
} | null;

export function compareCellValues(a: unknown, b: unknown): number {
  const aEmpty = a == null || a === '' || a === '-';
  const bEmpty = b == null || b === '' || b === '-';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const aNum = Number.parseFloat(String(a).replaceAll(',', ''));
  const bNum = Number.parseFloat(String(b).replaceAll(',', ''));
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return String(a).localeCompare(String(b), 'zh-CN', { numeric: true });
}

export function sortRows<T extends Record<string, any>>(
  data: T[],
  column: string,
  order: ReportSortOrder,
): T[] {
  return [...data].sort((rowA, rowB) => {
    const result = compareCellValues(rowA[column], rowB[column]);
    return order === 'asc' ? result : -result;
  });
}

/**
 * 列头单击状态机：升序 → 降序 → 取消（null）。
 * 换列时从升序重新开始。
 */
export function nextSortState(
  current: ReportSortState,
  column: string,
): ReportSortState {
  if (current && current.column === column && current.order === 'desc') {
    return null;
  }
  if (current && current.column === column && current.order === 'asc') {
    return { column, order: 'desc' };
  }
  return { column, order: 'asc' };
}

/**
 * 按最新 sortState 从原始行生成 dataSource。
 * 始终基于 original，避免在已排序结果上再排导致第三击取消后顺序错乱。
 */
export function applySortToRows<T extends Record<string, any>>(
  original: T[],
  sort: ReportSortState,
): T[] {
  if (!sort) {
    return [...original];
  }
  return sortRows(original, sort.column, sort.order);
}

/** 分组缓存键用的排序签名，避免同 length 不同顺序命中脏缓存 */
export function sortCacheKey(sort: ReportSortState): string {
  return sort ? `${sort.column}:${sort.order}` : 'none';
}
