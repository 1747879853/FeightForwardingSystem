/** 付费申请按应付汇率（crValue）折算 */
export const PAYABLE_PAY_SIDE = 1;

export const RATE_PRECISION = 6;

export function isLocalCurrencyCode(code?: null | string): boolean {
  const normalized = (code ?? '').trim().toUpperCase();
  return normalized === 'RMB' || normalized === 'CNY';
}

/** 1 / rate；无效时返回 null */
export function inverseRate(value: null | number | undefined): null | number {
  if (value == null || value === 0 || !Number.isFinite(value)) return null;
  return 1 / value;
}

/**
 * 1 原币 = ? 结算币。
 * 双方汇率均以「1 该币 = n 人民币」计；本位币视为 1。
 */
export function calcOriginalToSettlementRate(
  originalRmbRate: number | undefined,
  settlementRmbRate: number | undefined,
): number | undefined {
  if (
    originalRmbRate == null ||
    settlementRmbRate == null ||
    originalRmbRate <= 0 ||
    settlementRmbRate <= 0 ||
    !Number.isFinite(originalRmbRate) ||
    !Number.isFinite(settlementRmbRate)
  ) {
    return undefined;
  }
  return originalRmbRate / settlementRmbRate;
}
