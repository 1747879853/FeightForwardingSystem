import { describe, expect, it } from 'vitest';

import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { collectPageAppliedTotals } from './data';

function row(
  partial: Partial<PaymentApplicationAdminApi.PaymentApplicationDto>,
): PaymentApplicationAdminApi.PaymentApplicationDto {
  return {
    id: '1',
    status: 0,
    settlementId: 's1',
    tenantId: 1,
    userId: 1,
    ...partial,
  } as PaymentApplicationAdminApi.PaymentApplicationDto;
}

describe('collectPageAppliedTotals', () => {
  it('原币按币别把付减收后加总', () => {
    const totals = collectPageAppliedTotals([
      row({
        currencyGroup: [
          { id: 1, code: 'RMB', payAmount: 100, receiveAmount: 20 },
          { id: 2, code: 'USD', payAmount: 50, receiveAmount: 0 },
        ],
      }),
      row({
        id: '2',
        currencyGroup: [
          { id: 1, code: 'RMB', payAmount: 30, receiveAmount: 10 },
        ],
      }),
    ]);

    expect(totals).toEqual([
      { amount: 100, currencyCode: 'RMB', currencyId: 1 },
      { amount: 50, currencyCode: 'USD', currencyId: 2 },
    ]);
  });

  it('固定币别只计入结算币别，不把原币分组加进去', () => {
    const totals = collectPageAppliedTotals([
      row({
        currencyId: 1,
        currency: { code: 'RMB' },
        totalPayPrice: 200,
        totalReceivePrice: 40,
        currencyGroup: [
          { id: 2, code: 'USD', payAmount: 999, receiveAmount: 0 },
        ],
      }),
    ]);

    expect(totals).toEqual([
      { amount: 160, currencyCode: 'RMB', currencyId: 1 },
    ]);
  });

  it('空列表没有合计', () => {
    expect(collectPageAppliedTotals([])).toEqual([]);
  });
});
