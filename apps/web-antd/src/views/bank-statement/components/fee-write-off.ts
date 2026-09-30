/** 银行流水按费用核销：流水币录入，再折回费用原币 */

/** 与后端 MidpointRounding.AwayFromZero 对齐，正数即四舍五入到分 */
export function roundMoney(value: number) {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + Number.EPSILON)) / 100;
}

/** 流水币金额 ÷ 汇率 = 费用原币。汇率须大于 0 */
export function toOriginalAmount(bankAmount: number, rate: number) {
  if (!(rate > 0) || !Number.isFinite(bankAmount)) return null;
  return roundMoney(bankAmount / rate);
}

/** 费用原币 × 汇率 = 流水币 */
export function toBankAmount(originalAmount: number, rate: number) {
  if (!(rate > 0) || !Number.isFinite(originalAmount)) return null;
  return roundMoney(originalAmount * rate);
}

/**
 * 本行最多能占的流水：不超过费用剩余折合，也不超过流水还没被其他行占掉的部分。
 * room 已扣掉其他已选行。
 */
export function allocateStatementAmount(cap: number, room: number) {
  if (!(cap > 0)) return 0;
  return roundMoney(Math.min(cap, Math.max(0, room)));
}

/** 应收占流水，应付冲减流水 */
export function signedBankAmount(
  paySide: null | number | undefined,
  bankAmount: number,
) {
  const amount = Number(bankAmount);
  if (!Number.isFinite(amount)) return 0;
  return paySide === 1 ? -amount : amount;
}

export function netStatementUsage(
  rows: Array<{ bankAmount: number; paySide?: null | number }>,
) {
  return roundMoney(
    rows.reduce(
      (sum, row) => sum + signedBankAmount(row.paySide, row.bankAmount),
      0,
    ),
  );
}

export type StatementBalanceStatus = 'idle' | 'over' | 'partial' | 'settled';

/** 没勾选有效金额时不判结清；超出可用流水为 over */
export function statementBalance(available: number, used: number) {
  const balance = roundMoney(available - used);
  if (!(used > 0)) {
    return { balance, status: 'idle' as const };
  }
  if (balance < -0.001) {
    return { balance, status: 'over' as const };
  }
  if (balance <= 0.001) {
    return { balance: 0, status: 'settled' as const };
  }
  return { balance, status: 'partial' as const };
}

/** 流水充足时才能按费用剩余一次性结清（应付不占流水，始终允许） */
export function canSettleFeeInFull(options: {
  cap: number;
  paySide?: null | number;
  room: number;
}) {
  if (!(options.cap > 0)) return false;
  if (options.paySide === 1) return true;
  return options.cap <= options.room + 0.001;
}

/**
 * 勾选后的默认流水金额。
 * 应收取「剩余流水」和「费用折合」里较小的；应付按剩余原币折满，不挤占收款额度。
 */
export function suggestWriteOffAmount(options: {
  cap: null | number;
  paySide?: null | number;
  room: number;
}) {
  const cap = options.cap ?? 0;
  if (!(cap > 0)) return undefined;
  if (options.paySide === 1) return roundMoney(cap);
  const fill = allocateStatementAmount(cap, options.room);
  return fill > 0 ? fill : undefined;
}
