/** 收费结算：本次结算与跨币别汇率 */

export interface SettlementCurrencyRow {
  currencyId?: null | number | string;
  currencyCode?: null | string;
}

export interface ForeignCurrencyRate {
  currencyId: string;
  currencyCode: string;
}

export function isSameCurrencyId(
  left?: null | number | string,
  right?: null | number | string,
) {
  if (left == null || left === '' || right == null || right === '') {
    return false;
  }
  return String(left) === String(right);
}

/** 与银行流水币别不同、需要录入汇率的币别 */
export function collectForeignCurrencies(
  rows: SettlementCurrencyRow[],
  bankCurrencyId?: null | number | string,
  bankCurrencyCode?: null | string,
): ForeignCurrencyRate[] {
  const map = new Map<string, string>();
  for (const row of rows) {
    const currencyId = row.currencyId;
    if (currencyId == null || currencyId === '') continue;
    if (isSameCurrencyId(currencyId, bankCurrencyId)) continue;
    if (
      !bankCurrencyId &&
      row.currencyCode &&
      bankCurrencyCode &&
      row.currencyCode === bankCurrencyCode
    ) {
      continue;
    }
    const id = String(currencyId);
    if (!map.has(id)) map.set(id, row.currencyCode || id);
  }
  return [...map.entries()].map(([currencyId, currencyCode]) => ({
    currencyId,
    currencyCode,
  }));
}

export function findMissingExchangeRate(
  currencies: ForeignCurrencyRate[],
  rates: Record<string, null | number | undefined>,
) {
  return currencies.find((row) => {
    const rate = rates[row.currencyId];
    return rate == null || !(rate > 0);
  });
}

export function buildExchangeRateInputs(
  currencies: ForeignCurrencyRate[],
  rates: Record<string, null | number | undefined>,
) {
  return currencies.map((row) => ({
    currencyId: row.currencyId,
    exchangeRate: rates[row.currencyId] ?? undefined,
  }));
}
