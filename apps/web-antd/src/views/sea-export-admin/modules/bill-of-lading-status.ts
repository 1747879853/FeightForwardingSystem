import { billStatusOptions } from '#/views/bill-of-lading/rules';

/** 列表格内最多直接画出的张数，其余收进 +N */
export const SEA_EXPORT_BILL_STATUS_INLINE_LIMIT = 2;

export interface SeaExportBillStatusView {
  key: string;
  role: '主单' | '分单';
  label: string;
  color?: string;
}

function readStatus(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

/**
 * 把列表返回的提单摘要转成可展示项。
 * 后端约定主单在前、分单按创建时间从早到晚，因此下标 0 是主单。
 * null、非数组、空数组都得到空列表，避免详情上的 null 把格子弄坏。
 */
export function toSeaExportBillStatusItems(
  bills: null | ReadonlyArray<{ id?: unknown; status?: unknown }> | undefined,
): SeaExportBillStatusView[] {
  if (!Array.isArray(bills)) return [];
  return bills.flatMap((bill, index) => {
    if (!bill || typeof bill !== 'object') return [];
    const status = readStatus(bill.status);
    const option =
      status === undefined
        ? undefined
        : billStatusOptions.find((item) => item.value === status);
    return [
      {
        key: `${bill.id ?? 'bill'}-${index}`,
        role: index === 0 ? '主单' : '分单',
        label: option?.label ?? (status === undefined ? '--' : String(status)),
        color: option?.color,
      },
    ];
  });
}

export function formatSeaExportBillStatusSummary(
  items: SeaExportBillStatusView[],
): string {
  return items.map((item) => `${item.role} ${item.label}`).join('、');
}
