/**
 * 报表列顺序 / 固定 / 显隐的纯函数。
 * Handsontable 要求左固定列在最左、右固定列在最右。
 */

export type ReportLayoutColumn = {
  data?: string;
  fixed?: 'left' | 'right' | false;
  order?: number;
  visible?: boolean;
};

export function arrangeReportColumns<T extends ReportLayoutColumn>(
  columns: T[],
  options?: { includeHidden?: boolean },
): {
  columns: T[];
  fixedColumnsLeft: number;
  fixedColumnsRight: number;
} {
  const includeHidden = options?.includeHidden === true;
  const list = columns.filter((col) => {
    if (!col.data || col.data === '_groupDisplay') return false;
    if (includeHidden) return true;
    return col.visible !== false;
  });
  const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const left = sorted.filter((col) => col.fixed === 'left');
  const right = sorted.filter((col) => col.fixed === 'right');
  const middle = sorted.filter(
    (col) => col.fixed !== 'left' && col.fixed !== 'right',
  );
  return {
    columns: [...left, ...middle, ...right],
    fixedColumnsLeft: left.length,
    fixedColumnsRight: right.length,
  };
}

/**
 * 把拖拽后的视觉列序写回配置。
 * 只替换当前出现在表格里的列，隐藏列和分组占用列留在原槽位。
 */
export function mergeVisualColumnOrder<T extends ReportLayoutColumn>(
  columns: T[],
  visualKeys: string[],
): T[] {
  const sorted = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const byData = new Map<string, T>();
  columns.forEach((col) => {
    if (col.data) byData.set(col.data, col);
  });
  const queue = visualKeys.filter((key) => byData.has(key));
  const visualSet = new Set(queue);
  let cursor = 0;
  const next = sorted.map((col) => {
    if (!col.data || !visualSet.has(col.data)) return col;
    const key = queue[cursor];
    cursor += 1;
    return (key && byData.get(key)) || col;
  });
  return next.map((col, index) => ({ ...col, order: index }));
}
