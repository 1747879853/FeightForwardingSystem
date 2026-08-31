/** 付费申请业务分组上用于拼单号的最小结构 */
export interface PayAppMblNumGroup {
  transportOrder?: {
    mblNum?: string | null;
    commissionNum?: string | null;
  } | null;
}

function formatPayAppTransportOrderField(
  groups: PayAppMblNumGroup[] | null | undefined,
  field: 'mblNum' | 'commissionNum',
): string {
  const seen = new Set<string>();
  const nums: string[] = [];
  for (const group of groups ?? []) {
    const value = group.transportOrder?.[field]?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    nums.push(value);
  }
  return nums.join(',');
}

/**
 * 从 `payAppFeeBySeaExportGroup` 拼主提单号：trim、跳过空值、保序去重，逗号拼接。
 * 组内金额字段不要读，只取 `transportOrder.mblNum`。
 */
export function formatPayAppMblNums(
  groups: PayAppMblNumGroup[] | null | undefined,
): string {
  return formatPayAppTransportOrderField(groups, 'mblNum');
}

/**
 * 从 `payAppFeeBySeaExportGroup` 拼委托编号：trim、跳过空值、保序去重，逗号拼接。
 * 组内金额字段不要读，只取 `transportOrder.commissionNum`。
 */
export function formatPayAppCommissionNums(
  groups: PayAppMblNumGroup[] | null | undefined,
): string {
  return formatPayAppTransportOrderField(groups, 'commissionNum');
}
