/** 付费申请按应付汇率（crValue）折算 */
export const PAYABLE_PAY_SIDE = 1;

export const RATE_PRECISION = 6;

/** 弹窗/回写共用：按费用原币分组（付费申请按当天汇率，不再按开船日拆） */
export function currencyRatePairKey(
  currencyId?: null | number | string,
): string {
  return String(currencyId ?? '');
}

export interface OriginalCurrencyRatePair {
  currencyId: number;
  currencyCode: string;
}

/** 指定结算币别时按原币去重，原币=结算币的行不需要折算 */
export function collectOriginalCurrencyRatePairs(
  fees: Array<{
    currencyCode?: string;
    currencyId: number;
    currencyName?: string;
  }>,
  settlementCurrencyId: null | number | undefined,
): OriginalCurrencyRatePair[] {
  const map = new Map<string, OriginalCurrencyRatePair>();
  for (const fee of fees) {
    if (fee.currencyId === settlementCurrencyId) continue;
    const key = currencyRatePairKey(fee.currencyId);
    if (map.has(key)) continue;
    map.set(key, {
      currencyId: fee.currencyId,
      currencyCode: fee.currencyCode ?? fee.currencyName ?? '',
    });
  }
  return [...map.values()];
}

/** 1 / rate；无效时返回 null */
export function inverseRate(value: null | number | undefined): null | number {
  if (value == null || value === 0 || !Number.isFinite(value)) return null;
  return 1 / value;
}
