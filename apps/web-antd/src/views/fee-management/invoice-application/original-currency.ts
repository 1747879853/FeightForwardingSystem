/** 抽屉里「申请主币别」的默认项：不指定统一币别，按费用原币拆单。 */
export const ORIGINAL_APPLICATION_CURRENCY = '__original__';

export function isOriginalApplicationCurrency(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === ORIGINAL_APPLICATION_CURRENCY
  );
}

/** 按费用自身币别分组。没有有效币别的费用放进 missing。 */
export function groupFeesByCurrency(fees: any[]) {
  const groups = new Map<number, any[]>();
  const missing: any[] = [];
  for (const fee of fees) {
    const currencyId = Number(fee?.orderFee?.currencyId);
    if (!Number.isFinite(currencyId) || currencyId <= 0) {
      missing.push(fee);
      continue;
    }
    const bucket = groups.get(currencyId) ?? [];
    bucket.push(fee);
    groups.set(currencyId, bucket);
  }
  return { groups, missing };
}
