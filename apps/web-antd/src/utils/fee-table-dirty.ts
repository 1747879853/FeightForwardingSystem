/** 费用表脏检查：排除行内临时键，避免 _rowKey / 展示字段抖动误报 */
function pickFeeDirtyPayload(row: Record<string, unknown>) {
  const {
    _rowKey: _ignoredRowKey,
    __settlementName: _ignoredSettlementName,
    __isLocalCurrency: _ignoredLocalCurrency,
    ...rest
  } = row;
  return rest;
}

export function stableFeeRowsJson(rows: unknown[] | undefined): string {
  const list = Array.isArray(rows) ? rows : [];
  return JSON.stringify(
    list.map((row) =>
      row && typeof row === 'object'
        ? pickFeeDirtyPayload(row as Record<string, unknown>)
        : row,
    ),
  );
}

export function createFeeTableDirtyTracker(getRows: () => unknown[]) {
  let snapshot: null | string = null;
  return {
    isFeeDirty() {
      if (snapshot === null) return false;
      return stableFeeRowsJson(getRows()) !== snapshot;
    },
    syncFeeSnapshot() {
      snapshot = stableFeeRowsJson(getRows());
    },
  };
}
