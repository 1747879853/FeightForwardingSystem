/**
 * 开票申请多币别金额折算（与后端 InvoiceApplicationAmountRule 口径一致）
 *
 * 申请总额(主币别) = Σ_费用币别 round(Σ 该币别 appliedAmount × 该币别汇率, 2)
 * 主币别汇率恒为 1；缺汇率时返回 null。
 */

/** 四舍五入到指定小数位（AwayFromZero） */
export function toFinancialRound(value: number, digits = 2): number {
  const factor = 10 ** digits;
  const abs = Math.round(Math.abs(value) * factor + Number.EPSILON) / factor;
  return value < 0 ? -abs : abs;
}

export interface InvoiceApplicationExchangeRateRow {
  currencyId: number;
  exchangeRate: number | null | undefined;
  /** 展示用 */
  currencyCode?: string;
  currencyName?: string;
  /** 该币别原币申请合计（展示用） */
  appliedAmount?: number;
}

export interface FeeAppliedAmountItem {
  currencyId: number;
  appliedAmount: number;
}

/** 按币别汇总原币申请金额 */
export function sumAppliedAmountByCurrency(
  items: FeeAppliedAmountItem[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of items) {
    if (!item.currencyId) continue;
    map.set(
      item.currencyId,
      (map.get(item.currencyId) || 0) + (Number(item.appliedAmount) || 0),
    );
  }
  return map;
}

/**
 * 费用明细折成开票申请主币别合计。
 * 有费用币别缺汇率（且非主币别）时返回 null。
 */
export function toApplicationCurrency(
  items: FeeAppliedAmountItem[],
  applicationCurrencyId: number,
  rates:
    | Array<{ currencyId: number; exchangeRate?: null | number }>
    | Map<number, number>,
): null | number {
  if (!applicationCurrencyId) return null;

  const rateMap =
    rates instanceof Map
      ? rates
      : new Map(
          rates
            .filter((r) => r.currencyId != null)
            .map((r) => [r.currencyId, r.exchangeRate] as const),
        );

  const byCurrency = sumAppliedAmountByCurrency(items);
  let total = 0;

  for (const [currencyId, originalSum] of byCurrency.entries()) {
    let rate: number;
    if (currencyId === applicationCurrencyId) {
      rate = 1;
    } else {
      const raw = rateMap.get(currencyId);
      if (raw == null || Number(raw) <= 0) {
        return null;
      }
      rate = Number(raw);
    }
    total += toFinancialRound(originalSum * rate, 2);
  }

  return toFinancialRound(total, 2);
}

/** 发票人民币参考金额 = round(申请总额(主币别) × 发票汇率, 2) */
export function toInvoiceRmbAmount(
  totalAppliedInAppCurrency: null | number,
  invoiceExchangeRate: number,
): null | number {
  if (totalAppliedInAppCurrency == null) return null;
  return toFinancialRound(
    totalAppliedInAppCurrency * (invoiceExchangeRate || 1),
    2,
  );
}

/**
 * 从费用明细推导需要录入的汇率行（含主币别，主币别汇率固定 1）。
 * 已有汇率优先保留。
 */
export function buildExchangeRateRows(options: {
  applicationCurrencyId: number;
  items: FeeAppliedAmountItem[];
  existingRates?: InvoiceApplicationExchangeRateRow[];
  currencyMeta?: Map<
    number,
    { code?: string; cnName?: string; enName?: string }
  >;
}): InvoiceApplicationExchangeRateRow[] {
  const {
    applicationCurrencyId,
    items,
    existingRates = [],
    currencyMeta,
  } = options;
  const byCurrency = sumAppliedAmountByCurrency(items);
  const existingMap = new Map(
    existingRates.map((r) => [r.currencyId, r] as const),
  );

  const rows: InvoiceApplicationExchangeRateRow[] = [];
  for (const [currencyId, appliedAmount] of byCurrency.entries()) {
    const existing = existingMap.get(currencyId);
    const meta = currencyMeta?.get(currencyId);
    const isMain = currencyId === applicationCurrencyId;
    rows.push({
      currencyId,
      exchangeRate: isMain ? 1 : (existing?.exchangeRate ?? undefined),
      currencyCode: existing?.currencyCode || meta?.code,
      currencyName: existing?.currencyName || meta?.cnName || meta?.enName,
      appliedAmount: toFinancialRound(appliedAmount, 2),
    });
  }

  // 主币别排前，其余按 currencyId
  rows.sort((a, b) => {
    if (a.currencyId === applicationCurrencyId) return -1;
    if (b.currencyId === applicationCurrencyId) return 1;
    return a.currencyId - b.currencyId;
  });

  return rows;
}

/** 校验非主币别汇率均已填写且 > 0；返回缺汇率的币别 ID 列表 */
export function getMissingExchangeRateCurrencyIds(
  applicationCurrencyId: number,
  items: FeeAppliedAmountItem[],
  rates: Array<{ currencyId: number; exchangeRate?: null | number }>,
): number[] {
  const rateMap = new Map(
    rates.map((r) => [r.currencyId, r.exchangeRate] as const),
  );
  const byCurrency = sumAppliedAmountByCurrency(items);
  const missing: number[] = [];
  for (const currencyId of byCurrency.keys()) {
    if (currencyId === applicationCurrencyId) continue;
    const rate = rateMap.get(currencyId);
    if (rate == null || Number(rate) <= 0) {
      missing.push(currencyId);
    }
  }
  return missing;
}

/** 组装提交用汇率入参（可只传非主币别；主币别也可带上 =1） */
export function toExchangeRateInputs(
  applicationCurrencyId: number,
  rates: InvoiceApplicationExchangeRateRow[],
  options?: { includeMain?: boolean },
): Array<{ currencyId: number; exchangeRate: number }> {
  const includeMain = options?.includeMain ?? false;
  return rates
    .filter((r) => {
      if (r.currencyId === applicationCurrencyId) return includeMain;
      return r.exchangeRate != null && Number(r.exchangeRate) > 0;
    })
    .map((r) => ({
      currencyId: r.currencyId,
      exchangeRate:
        r.currencyId === applicationCurrencyId ? 1 : Number(r.exchangeRate),
    }));
}
