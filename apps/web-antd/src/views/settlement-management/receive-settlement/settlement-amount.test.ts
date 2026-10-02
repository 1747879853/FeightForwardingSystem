import { describe, expect, it } from 'vitest';

import {
  calcOriginalSettledAmount,
  hasSharedOrderFee,
  isSettledAmountWithinQuota,
  settledAmountBounds,
  suggestInvoiceActualSettled,
} from './settlement-amount';

describe('负数费用结算金额', () => {
  it('正数额度范围是 0 到额度，负数额度范围是额度到 0', () => {
    expect(settledAmountBounds(100)).toEqual({ min: 0, max: 100 });
    expect(settledAmountBounds(-100)).toEqual({ min: -100, max: 0 });
    expect(settledAmountBounds(0)).toEqual({ min: undefined, max: undefined });
  });

  it('必须与额度同号，且绝对值不超过额度', () => {
    expect(isSettledAmountWithinQuota(50, 100)).toBe(true);
    expect(isSettledAmountWithinQuota(100, 100)).toBe(true);
    expect(isSettledAmountWithinQuota(150, 100)).toBe(false);
    expect(isSettledAmountWithinQuota(-10, 100)).toBe(false);
    expect(isSettledAmountWithinQuota(0, 100)).toBe(false);

    expect(isSettledAmountWithinQuota(-50, -100)).toBe(true);
    expect(isSettledAmountWithinQuota(-100, -100)).toBe(true);
    expect(isSettledAmountWithinQuota(-150, -100)).toBe(false);
    expect(isSettledAmountWithinQuota(10, -100)).toBe(false);
  });

  it('负数应收会把原始结算金额拉低', () => {
    expect(
      calcOriginalSettledAmount(
        [
          { paySide: 0, settledAmount: 500, currencyId: 1 },
          { paySide: 0, settledAmount: -100, currencyId: 1 },
        ],
        {},
        1,
      ),
    ).toBe(400);
  });

  it('按发票参考值按收正付负带符号相加', () => {
    expect(
      suggestInvoiceActualSettled([
        { paySide: 0, settledAmount: 500, exchangeRate: 1 },
        { paySide: 0, settledAmount: -100, exchangeRate: 1 },
      ]),
    ).toBe(400);
  });

  it('同一费用出现在多行时需要提示共享额度', () => {
    expect(hasSharedOrderFee([{ orderFeeId: 'a' }, { orderFeeId: 'a' }])).toBe(
      true,
    );
    expect(hasSharedOrderFee([{ orderFeeId: 'a' }, { orderFeeId: 'b' }])).toBe(
      false,
    );
  });
});
