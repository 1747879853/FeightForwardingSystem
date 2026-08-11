import { describe, expect, it } from 'vitest';

import {
  appliedAmountFieldKey,
  calcAppliedConvertedTotal,
  filterOrderGroups,
  groupFeesByOrder,
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

describe('filterOrderGroups', () => {
  const currencies = [
    { currencyId: 1, currencyCode: 'USD' },
    { currencyId: 2, currencyCode: 'CNY' },
  ];

  it('按费用名称筛选时仅保留命中费用行，同组其他费用不显示', () => {
    const groups = groupFeesByOrder(
      [
        fee({
          feeId: 'f1',
          feeCodeId: 10,
          feeCodeName: '海运费',
          appliedAmount: 100,
          paySide: 1,
        }),
        fee({
          feeId: 'f2',
          feeCodeId: 20,
          feeCodeName: '港杂费',
          appliedAmount: 50,
          paySide: 1,
        }),
      ],
      currencies,
    );

    const filtered = filterOrderGroups(groups, { feeCodeId: 10 }, currencies);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.children.map((c) => c.feeId)).toEqual(['f1']);
    expect(
      (filtered[0] as unknown as Record<string, number>)[
        appliedAmountFieldKey(1)
      ],
    ).toBe(100);
  });

  it('按币别筛选时仅保留该币别费用行', () => {
    const groups = groupFeesByOrder(
      [
        fee({
          feeId: 'usd',
          currencyId: 1,
          currencyCode: 'USD',
          appliedAmount: 80,
          paySide: 1,
        }),
        fee({
          feeId: 'cny',
          currencyId: 2,
          currencyCode: 'CNY',
          appliedAmount: 40,
          paySide: 1,
        }),
      ],
      currencies,
    );

    const filtered = filterOrderGroups(groups, { currencyId: 2 }, currencies);

    expect(filtered[0]?.children.map((c) => c.feeId)).toEqual(['cny']);
  });

  it('无匹配费用时不返回该订单组', () => {
    const groups = groupFeesByOrder(
      [fee({ feeId: 'f1', feeCodeId: 10, paySide: 1, appliedAmount: 1 })],
      currencies,
    );
    expect(filterOrderGroups(groups, { feeCodeId: 99 }, currencies)).toEqual(
      [],
    );
  });
});
