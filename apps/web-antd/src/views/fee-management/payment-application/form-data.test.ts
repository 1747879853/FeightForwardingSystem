import { describe, expect, it } from 'vitest';

import {
  calcAppliedConvertedTotal,
  signedAppliedAmount,
  summarizeByCurrency,
  summarizeByCurrencyWithConversion,
  type FeeDetailRow,
} from './form-data';

function fee(
  partial: Partial<FeeDetailRow> & Pick<FeeDetailRow, 'paySide'>,
): FeeDetailRow {
  return {
    feeId: 'f1',
    transportOrderId: 'o1',
    feeCodeId: 1,
    currencyId: 1,
    currencyCode: 'USD',
    currencyName: '美元',
    settlementId: 's1',
    amount: 0,
    settledAmount: 0,
    unRqstPaymentAmount: 0,
    appliedAmount: 0,
    ...partial,
  };
}

describe('payment application fee amount netting', () => {
  it('signedAppliedAmount: 付为正、收为负', () => {
    expect(signedAppliedAmount(fee({ paySide: 1, appliedAmount: 80 }))).toBe(
      80,
    );
    expect(signedAppliedAmount(fee({ paySide: 0, appliedAmount: 30 }))).toBe(
      -30,
    );
  });

  it('summarizeByCurrency: 同币别按付减收', () => {
    const rows = [
      fee({ feeId: 'a', paySide: 1, appliedAmount: 100 }),
      fee({ feeId: 'b', paySide: 0, appliedAmount: 40 }),
    ];
    expect(summarizeByCurrency(rows)).toEqual([
      expect.objectContaining({
        currencyId: 1,
        totalAmount: 60,
      }),
    ]);
  });

  it('summarizeByCurrencyWithConversion: 原币与折算均按付减收', () => {
    const rows = [
      fee({ feeId: 'a', paySide: 1, appliedAmount: 100, rate: 7 }),
      fee({ feeId: 'b', paySide: 0, appliedAmount: 20, rate: 7 }),
    ];
    expect(summarizeByCurrencyWithConversion(rows)).toEqual([
      expect.objectContaining({
        currencyId: 1,
        rate: 7,
        originalTotal: 80,
        convertedTotal: 560,
      }),
    ]);
  });

  it('calcAppliedConvertedTotal: 跨币别按申请金额折币求和', () => {
    const rows = [
      fee({ feeId: 'a', paySide: 1, appliedAmount: 100, rate: 7.1 }),
      fee({
        feeId: 'b',
        currencyId: 2,
        paySide: 1,
        appliedAmount: 50,
        rate: 1,
      }),
      fee({ feeId: 'c', paySide: 0, appliedAmount: 20, rate: 7.1 }),
    ];
    expect(calcAppliedConvertedTotal(rows)).toBe(618);
  });
});
