import type { BillOfLading, BillTaskDetail } from '#/api/bill-of-lading';
import type { ReportApi } from '#/api/system/report';

export interface OriginLine {
  code: string;
  name: string;
  receivable: number;
  received: number;
  unReceived: number;
}

export function collectOriginLines(
  rows: ReportApi.ArrearsReportDto[] | undefined,
): OriginLine[] {
  const grouped = new Map<string, OriginLine>();
  for (const row of rows ?? []) {
    for (const item of row.currencies ?? []) {
      const code = item.currency?.code;
      if (!code) continue;
      const current = grouped.get(code) ?? {
        code,
        name: item.currency.cnName ?? '',
        receivable: 0,
        received: 0,
        unReceived: 0,
      };
      current.receivable += Number(item.receivable) || 0;
      current.received += Number(item.received) || 0;
      current.unReceived += Number(item.unReceived) || 0;
      if (!current.name && item.currency?.cnName) {
        current.name = item.currency.cnName;
      }
      grouped.set(code, current);
    }
  }
  return [...grouped.values()];
}

function orderKey(bill?: BillOfLading | null) {
  return String(
    bill?.seaExport?.id || bill?.seaExport?.transportOrder?.id || '',
  );
}

/** 与审核详情摘要相同：只汇总本批提单所属票的欠费原币。 */
export function summarizeBatchOrigin(detail?: BillTaskDetail | null) {
  const orderIds = new Set(
    (detail?.billOfLadingTasks ?? [])
      .map((item) => orderKey(item.billOfLading))
      .filter(Boolean),
  );
  const rows = (detail?.arrearsReports ?? []).filter((row) =>
    orderIds.has(String(row.transportOrderId)),
  );
  const codes = [
    ...new Set(rows.map((row) => row.localCurrencyCode).filter(Boolean)),
  ];
  return {
    code: codes[0] ?? 'RMB',
    lines: collectOriginLines(rows),
  };
}
