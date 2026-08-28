/** 付费申请业务分组上用于拼提单号的最小结构 */
export interface PayAppMblNumGroup {
  transportOrder?: { mblNum?: string | null } | null;
}

/**
 * 从 `payAppFeeBySeaExportGroup` 拼提单号：trim、跳过空值、保序去重，逗号拼接。
 * 组内金额字段不要读，提单号只取 `transportOrder.mblNum`。
 */
export function formatPayAppMblNums(
  groups: PayAppMblNumGroup[] | null | undefined,
): string {
  const seen = new Set<string>();
  const nums: string[] = [];
  for (const group of groups ?? []) {
    const mblNum = group.transportOrder?.mblNum?.trim();
    if (!mblNum || seen.has(mblNum)) continue;
    seen.add(mblNum);
    nums.push(mblNum);
  }
  return nums.join(',');
}
