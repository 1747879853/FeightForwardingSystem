import { toExchangeRateDateKey } from '#/utils/exchange-rate-cache';

/** 付费申请按应付汇率（crValue）折算 */
export const PAYABLE_PAY_SIDE = 1;

export const RATE_PRECISION = 6;

/** 弹窗/回写共用：币别 + 匹配日（无 ETD 为空，peek 时按今天） */
export function currencyRatePairKey(
  currencyId?: null | number | string,
  asOf?: Date | null | number | string,
): string {
  return `${String(currencyId ?? '')}_${toExchangeRateDateKey(asOf) ?? ''}`;
}

/**
 * 汇率表未命中时，仅公司本位币兜底为 1（对齐业务联系单）。
 * 不要用 RMB/CNY 代码判断——公司本位币可能是 USD。
 */
export function fallbackLocalCurrencyRate(
  tableRate: number | undefined,
  currencyId?: null | number | string,
  localCurrencyId?: null | number | string,
): number | undefined {
  if (tableRate !== undefined) return tableRate;
  if (
    localCurrencyId == null ||
    localCurrencyId === '' ||
    currencyId == null ||
    currencyId === ''
  ) {
    return undefined;
  }
  return String(currencyId) === String(localCurrencyId) ? 1 : undefined;
}

export interface OriginalCurrencyRatePair {
  currencyId: number;
  currencyCode: string;
  /** 开船日 YYYY-MM-DD；空则匹配今天 */
  asOf?: string;
}

/** 指定结算币别时，按「原币 + 开船日」去重，原币=结算币的行不需要折算 */
export function collectOriginalCurrencyRatePairs(
  fees: Array<{
    currencyCode?: string;
    currencyId: number;
    currencyName?: string;
    etd?: string;
  }>,
  settlementCurrencyId: null | number | undefined,
): OriginalCurrencyRatePair[] {
  const map = new Map<string, OriginalCurrencyRatePair>();
  for (const fee of fees) {
    if (fee.currencyId === settlementCurrencyId) continue;
    const asOf = toExchangeRateDateKey(fee.etd);
    const key = currencyRatePairKey(fee.currencyId, asOf);
    if (map.has(key)) continue;
    map.set(key, {
      currencyId: fee.currencyId,
      currencyCode: fee.currencyCode ?? fee.currencyName ?? '',
      asOf,
    });
  }
  return [...map.values()];
}

/** 1 / rate；无效时返回 null */
export function inverseRate(value: null | number | undefined): null | number {
  if (value == null || value === 0 || !Number.isFinite(value)) return null;
  return 1 / value;
}

/**
 * 1 原币 = ? 结算币。
 * 双方汇率均以「1 该币 = n 公司本位币」计；未维护且是本位币时视为 1。
 */
export function calcOriginalToSettlementRate(
  originalLocalRate: number | undefined,
  settlementLocalRate: number | undefined,
): number | undefined {
  if (
    originalLocalRate == null ||
    settlementLocalRate == null ||
    originalLocalRate <= 0 ||
    settlementLocalRate <= 0 ||
    !Number.isFinite(originalLocalRate) ||
    !Number.isFinite(settlementLocalRate)
  ) {
    return undefined;
  }
  return originalLocalRate / settlementLocalRate;
}
