export function readPath(row: unknown, dataIndex: unknown) {
  if (row == null || dataIndex == null || dataIndex === '') return undefined;
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  let current: any = row;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function filled(value: unknown) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.some((item) => filled(item));
  return true;
}

function fieldKey(dataIndex: unknown) {
  if (Array.isArray(dataIndex)) {
    return String(dataIndex[dataIndex.length - 1] ?? '');
  }
  return String(dataIndex ?? '');
}

/** 整列都空时不占位。审核人和意见留在状态浮层里，有结论再出列。 */
const emptyKeys = new Set([
  'auditUserName',
  'blNum',
  'blNums',
  'overdueRemark',
  'remark',
]);

export function compactReviewColumns<
  T extends { dataIndex?: unknown; key?: unknown; title?: unknown },
>(
  columns: T[],
  rows: readonly unknown[],
  options?: { hideUniformSettlement?: boolean },
) {
  return columns.filter((column) => {
    if (column.key === 'held') {
      return rows.some((row) => readPath(row, column.dataIndex) === true);
    }
    if (options?.hideUniformSettlement && column.title === '结算对象') {
      const names = new Set(
        rows
          .map((row) => String(readPath(row, column.dataIndex) ?? '').trim())
          .filter(Boolean),
      );
      return names.size > 1;
    }
    const key = fieldKey(column.dataIndex);
    if (!emptyKeys.has(key) && !emptyKeys.has(String(column.key ?? ''))) {
      return true;
    }
    return rows.some((row) =>
      filled(readPath(row, column.dataIndex ?? column.key)),
    );
  });
}

export function tableScrollWidth(
  columns: { width?: number }[],
  selection = false,
) {
  return columns.reduce(
    (sum, column) => sum + (Number(column.width) || 120),
    selection ? 62 : 0,
  );
}

export interface MoneyBucket {
  amount: number;
  code: string;
}

/** 按本位币加总未收。超期只计超期天数大于 0 的行，不同本位币不混加。 */
export function sumUnreceivedByCurrency(
  rows: readonly {
    localCurrencyCode?: null | string;
    overdueDays?: null | number;
    totalUnReceived?: null | number;
  }[],
  onlyOverdue = false,
): MoneyBucket[] {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    if (onlyOverdue && !(Number(row.overdueDays) > 0)) continue;
    const amount = Number(row.totalUnReceived) || 0;
    if (!amount) continue;
    const code = row.localCurrencyCode || 'RMB';
    grouped.set(code, (grouped.get(code) ?? 0) + amount);
  }
  return [...grouped.entries()].map(([code, amount]) => ({ code, amount }));
}
