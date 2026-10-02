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
 * room 已扣掉其他已选行。只用于正数上限。
 */
export function allocateStatementAmount(cap: number, room: number) {
  if (!(cap > 0)) return 0;
  return roundMoney(Math.min(cap, Math.max(0, room)));
}

/** 应付、负数应收会把净额拉低，不跟收款抢额度。 */
function reducesStatementNet(paySide: null | number | undefined, cap: number) {
  const negative = cap < 0;
  if (paySide === 1) return !negative;
  return negative;
}

/** 把录入金额夹进与额度同号的范围。 */
export function clampStatementAmount(value: number, cap: number) {
  if (!Number.isFinite(value) || !Number.isFinite(cap)) return 0;
  if (cap < 0) return roundMoney(Math.min(0, Math.max(cap, value)));
  return roundMoney(Math.min(cap, Math.max(0, value)));
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

/** 没勾选有效金额时不判结清；超出可用流水为 over。负数净额也算已录入。 */
export function statementBalance(available: number, used: number) {
  const balance = roundMoney(available - used);
  if (Math.abs(used) < 0.005) {
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
  if (!(Math.abs(options.cap) > 0)) return false;
  if (reducesStatementNet(options.paySide, options.cap)) return true;
  return Math.abs(options.cap) <= options.room + 0.001;
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
  if (!(Math.abs(cap) > 0)) return undefined;
  if (reducesStatementNet(options.paySide, cap)) return roundMoney(cap);
  if (!(options.room > 0.001)) return undefined;
  if (cap > 0) {
    const fill = allocateStatementAmount(cap, options.room);
    return fill > 0 ? fill : undefined;
  }
  const magnitude = Math.min(Math.abs(cap), options.room);
  const fill = roundMoney(-magnitude);
  return fill < 0 ? fill : undefined;
}

/** 自动核销接口只收这几种筛选；其余检索条件不会传给后端 */
export type AutoAllocationSearchValues = {
  clientId?: null | number | string;
  commissionNum?: null | string;
  currencyId?: null | number | string;
  etdRange?: null | unknown[];
  keyword?: null | string;
  mblNum?: null | string;
  operatorIds?: null | Array<number | string>;
  saleIds?: null | Array<number | string>;
  statementNum?: null | string;
};

function hasText(value: null | string | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasIdList(value: null | Array<number | string> | undefined) {
  return Array.isArray(value) && value.length > 0;
}

function hasSingleId(value: null | number | string | undefined) {
  return value !== undefined && value !== null && value !== '';
}

/** 从表单取出自动核销可传的对账单号 */
export function pickAutoAllocationStatementNum(
  values: AutoAllocationSearchValues,
) {
  if (!hasText(values.statementNum)) return undefined;
  return values.statementNum!.trim();
}

/**
 * 是否填了自动核销接口不认的检索条件。
 * 这些条件不会随 AddByAutoAllocationAsync 提交；「客户对账」不算。
 */
export function hasIgnoredAutoAllocationFilters(
  values: AutoAllocationSearchValues,
) {
  if (hasText(values.keyword)) return true;
  if (hasText(values.commissionNum)) return true;
  if (hasText(values.mblNum)) return true;
  if (hasSingleId(values.clientId)) return true;
  if (hasSingleId(values.currencyId)) return true;
  if (Array.isArray(values.etdRange) && values.etdRange.some(Boolean)) {
    return true;
  }
  if (hasIdList(values.saleIds)) return true;
  if (hasIdList(values.operatorIds)) return true;
  return false;
}

/** 自动核销金额相对剩余可用流水的校验结果 */
export type AutoAllocationAmountReason =
  | 'ok'
  | 'empty'
  | 'not-positive'
  | 'over-available';

export function checkAutoAllocationAmount(
  amount: null | number | undefined,
  available: number,
): { amount: number; reason: AutoAllocationAmountReason } {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return { amount: 0, reason: 'empty' };
  }
  const rounded = roundMoney(amount);
  if (!(rounded > 0)) {
    return { amount: 0, reason: 'not-positive' };
  }
  if (rounded > roundMoney(available) + 0.001) {
    return { amount: rounded, reason: 'over-available' };
  }
  return { amount: rounded, reason: 'ok' };
}
