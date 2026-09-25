import { describe, expect, it } from 'vitest';

import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';

import {
  buildCtnPriceChangeMap,
  buildFreightRouteKey,
  findPreviousFreightRate,
} from './freight-price-change';

function row(
  partial: Partial<SeFreiPriceOutDto> & { id: string },
): SeFreiPriceOutDto {
  return {
    recommend: false,
    carrierId: 1,
    polId: 10,
    podId: 20,
    isDirect: true,
    validTimeStart: '2026-01-01',
    validTimeEnd: '2026-01-31',
    currencyId: 1,
    isValid: 0,
    creationTime: '2026-01-01',
    ...partial,
  } as SeFreiPriceOutDto;
}

describe('freight-price-change', () => {
  it('builds route key with pot1', () => {
    expect(
      buildFreightRouteKey({
        carrierId: 1,
        polId: 2,
        podId: 3,
        isDirect: false,
        poT1Id: 9,
      }),
    ).toBe('1|2|3|0|9');
  });

  it('finds previous by validTimeEnd', () => {
    const current = row({
      id: 'c',
      validTimeEnd: '2026-03-31',
      seFreiPriceCtns: [
        { id: '1', seFreiPriceId: 'c', ctnCodeId: 1, cost: 100, sugPrice: 120 },
      ],
    });
    const older = row({
      id: 'a',
      validTimeEnd: '2026-01-31',
      seFreiPriceCtns: [
        { id: '2', seFreiPriceId: 'a', ctnCodeId: 1, cost: 80, sugPrice: 90 },
      ],
    });
    const mid = row({
      id: 'b',
      validTimeEnd: '2026-02-28',
      seFreiPriceCtns: [
        { id: '3', seFreiPriceId: 'b', ctnCodeId: 1, cost: 90, sugPrice: 100 },
      ],
    });
    const previous = findPreviousFreightRate(current, [older, mid, current]);
    expect(previous?.id).toBe('b');
  });

  it('computes cost and sug deltas by container name', () => {
    const current = row({
      id: 'c',
      validTimeEnd: '2026-03-31',
      seFreiPriceCtns: [
        {
          id: '1',
          seFreiPriceId: 'c',
          ctnCodeId: 1,
          cost: 100,
          sugPrice: 150,
          ctnCode: { ctnName: '40HC' } as any,
        },
      ],
    });
    const previous = row({
      id: 'b',
      validTimeEnd: '2026-02-28',
      seFreiPriceCtns: [
        {
          id: '2',
          seFreiPriceId: 'b',
          ctnCodeId: 1,
          cost: 80,
          sugPrice: 200,
          ctnCode: { ctnName: '40HC' } as any,
        },
      ],
    });
    expect(buildCtnPriceChangeMap(current, previous)).toEqual({
      '40HC': { costDelta: 20, sugDelta: -50 },
    });
  });
});
