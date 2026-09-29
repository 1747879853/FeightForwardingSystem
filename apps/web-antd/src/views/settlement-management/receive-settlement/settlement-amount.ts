/** 收费结算：本次结算与跨币别汇率 */

import { toNetAmount } from './form-data';

export interface SettlementCurrencyRow {
  currencyId?: null | number | string;
  currencyCode?: null | string;
}

export interface ForeignCurrencyRate {
  currencyId: string;
  currencyCode: string;
}

export interface DisplayCurrencyRate extends ForeignCurrencyRate {
  /** 与银行流水同币别，固定为 1 且不可改 */
  locked: boolean;
}

export interface OriginalSettledRow extends SettlementCurrencyRow {
  /** 0 应收，1 应付 */
  paySide?: null | number;
  settledAmount?: null | number;
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

function isSameBankCurrency(
  row: SettlementCurrencyRow,
  bankCurrencyId?: null | number | string,
  bankCurrencyCode?: null | string,
) {
  if (isSameCurrencyId(row.currencyId, bankCurrencyId)) return true;
  return (
    !bankCurrencyId &&
    !!row.currencyCode &&
    !!bankCurrencyCode &&
    row.currencyCode === bankCurrencyCode
  );
}

/** 明细里出现的币别。与银行流水相同的排在前面，并标记为不可改 */
export function collectDisplayCurrencies(
  rows: SettlementCurrencyRow[],
  bankCurrencyId?: null | number | string,
  bankCurrencyCode?: null | string,
): DisplayCurrencyRate[] {
  const map = new Map<string, DisplayCurrencyRate>();
  for (const row of rows) {
    const currencyId = row.currencyId;
    if (currencyId == null || currencyId === '') continue;
    const id = String(currencyId);
    if (map.has(id)) continue;
    map.set(id, {
      currencyId: id,
      currencyCode: row.currencyCode || id,
      locked: isSameBankCurrency(row, bankCurrencyId, bankCurrencyCode),
    });
  }
  return [...map.values()].sort((left, right) =>
    left.locked === right.locked ? 0 : left.locked ? -1 : 1,
  );
}

/** 与银行流水币别不同、需要录入汇率的币别 */
export function collectForeignCurrencies(
  rows: SettlementCurrencyRow[],
  bankCurrencyId?: null | number | string,
  bankCurrencyCode?: null | string,
): ForeignCurrencyRate[] {
  return collectDisplayCurrencies(
    rows,
    bankCurrencyId,
    bankCurrencyCode,
  ).filter((row) => !row.locked);
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

export function missingExchangeRateMessage(currencyCode: string) {
  return `币别[${currencyCode}]与银行流水币别不同，汇率必填且必须大于 0`;
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

/** 与后端 MidpointRounding.AwayFromZero 对齐，正数即四舍五入 */
function roundMoney(value: number) {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + Number.EPSILON)) / 100;
}

/**
 * 原始结算金额：每行 round(原币结算额 × 汇率, 2)，收为正、付为负再相加。
 * 与流水同币别汇率按 1。任一外币汇率缺失时返回 null。没有明细时为 0。
 */
export function calcOriginalSettledAmount(
  rows: OriginalSettledRow[],
  rates: Record<string, null | number | undefined>,
  bankCurrencyId?: null | number | string,
  bankCurrencyCode?: null | string,
): null | number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const row of rows) {
    const amount = row.settledAmount;
    if (amount == null || !Number.isFinite(Number(amount))) return null;
    const same = isSameBankCurrency(row, bankCurrencyId, bankCurrencyCode);
    const rate = same
      ? 1
      : row.currencyId == null || row.currencyId === ''
        ? undefined
        : rates[String(row.currencyId)];
    if (rate == null || !(rate > 0)) return null;
    const line = roundMoney(Number(amount) * rate);
    sum += row.paySide === 1 ? -line : line;
  }
  return roundMoney(sum);
}

/** 差值 = 本次结算 − 原始结算金额。任一为空时不计算 */
export function calcDiffAmount(
  actualSettled: null | number | undefined,
  originalSettledAmount: null | number,
) {
  if (actualSettled == null || originalSettledAmount == null) return null;
  return roundMoney(actualSettled - originalSettledAmount);
}

export interface InvoiceSettleReferenceRow {
  settledAmount: number;
  exchangeRate?: null | number;
  paySide?: null | number;
}

/**
 * 按发票结算的参考原始结算金额。
 * 每行先把本次金额按汇率折到发票开出币别并舍到分，再按应收为正、应付为负相加。
 * 任一行缺汇率时无法给参考值。
 */
export function suggestInvoiceActualSettled(
  rows: InvoiceSettleReferenceRow[],
): null | number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const row of rows) {
    if (row.exchangeRate == null || Number.isNaN(Number(row.exchangeRate))) {
      return null;
    }
    sum += toNetAmount(
      row.paySide,
      roundMoney(row.settledAmount * row.exchangeRate),
    );
  }
  return roundMoney(sum);
}

export function remainingSharedSettleable(
  selected: Array<{
    orderFeeId: string;
    rowKey: string;
    settledAmount: number;
  }>,
  orderFeeId: string,
  settleable: number,
  excludeRowKey?: string,
) {
  const used = selected
    .filter(
      (row) => row.orderFeeId === orderFeeId && row.rowKey !== excludeRowKey,
    )
    .reduce((sum, row) => sum + row.settledAmount, 0);
  return roundMoney(Math.max(0, settleable - used));
}

export function findFeeSettleableOverflow(
  rows: Array<{
    feeName?: string;
    invoiceSettleableAmount?: null | number;
    orderFeeId: string;
    settledAmount: number;
  }>,
) {
  const consumed = new Map<string, number>();
  const settleable = new Map<string, number>();
  const names = new Map<string, string>();
  for (const row of rows) {
    consumed.set(
      row.orderFeeId,
      (consumed.get(row.orderFeeId) ?? 0) + row.settledAmount,
    );
    settleable.set(row.orderFeeId, row.invoiceSettleableAmount ?? 0);
    if (row.feeName) names.set(row.orderFeeId, row.feeName);
  }
  for (const [orderFeeId, used] of consumed) {
    const cap = settleable.get(orderFeeId) ?? 0;
    if (used > cap + 1e-6) {
      return { feeName: names.get(orderFeeId) || '-', settleable: cap };
    }
  }
  return null;
}
