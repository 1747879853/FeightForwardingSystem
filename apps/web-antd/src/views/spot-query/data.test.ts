import { describe, expect, it } from 'vitest';

import {
  buildSpotViewModel,
  feeCategoryLabel,
  sortSpotCards,
  type SpotQueryResultDto,
} from './data';

describe('buildSpotViewModel', () => {
  it('merges same vessel voyage across container types and keeps fails', () => {
    const results: SpotQueryResultDto[] = [
      {
        status: 1,
        ctnCode: { id: 1, ctnName: '20GP' },
        spotList: [
          {
            carrierCode: 'ONE',
            vessel: 'SPIL KARTINI',
            innerVoyno: '020S',
            etd: '2026-10-24',
            eta: '2026-11-17',
            voyage: 24,
            isDirect: false,
            routeCode: 'JID',
            freightCurrency: 'USD',
            freightAmount: 950,
            totalCurrency: 'USD',
            totalAmount: 1150,
          },
        ],
      },
      {
        status: 1,
        ctnCode: { id: 3, ctnName: '40HQ' },
        isReused: true,
        creationTime: new Date(Date.now() - 15 * 60_000).toISOString(),
        spotList: [
          {
            carrierCode: 'ONE',
            vessel: 'SPIL KARTINI',
            innerVoyno: '020S',
            etd: '2026-10-24',
            eta: '2026-11-17',
            voyage: 24,
            isDirect: false,
            routeCode: 'JID',
            freightCurrency: 'USD',
            freightAmount: 1600,
            totalCurrency: 'USD',
            totalAmount: 1800,
          },
        ],
      },
      {
        status: 2,
        ctnCode: { id: 2, ctnName: '40GP' },
        errorMessage: '三方接口查询超时',
        spotList: [],
      },
    ];

    const view = buildSpotViewModel(results);
    expect(view.cards).toHaveLength(1);
    expect(view.cards[0]?.prices.map((p) => p.ctnName)).toEqual([
      '20GP',
      '40HQ',
    ]);
    expect(view.fails).toEqual([
      { ctnName: '40GP', errorMessage: '三方接口查询超时' },
    ]);
    expect(view.reuseHints[0]?.ctnName).toBe('40HQ');
    expect(view.reuseHints[0]?.minutesAgo).toBeGreaterThanOrEqual(14);
  });

  it('sorts by lowest total price', () => {
    const { cards } = buildSpotViewModel([
      {
        status: 1,
        ctnCode: { id: 1, ctnName: '40HQ' },
        spotList: [
          {
            carrierCode: 'A',
            vessel: 'V1',
            innerVoyno: '1',
            etd: '2026-10-01',
            totalAmount: 2000,
            totalCurrency: 'USD',
          },
          {
            carrierCode: 'B',
            vessel: 'V2',
            innerVoyno: '2',
            etd: '2026-10-02',
            totalAmount: 1500,
            totalCurrency: 'USD',
          },
        ],
      },
    ]);
    const sorted = sortSpotCards(cards, 'lowestPrice');
    expect(sorted[0]?.carrierCode).toBe('B');
  });
});

describe('feeCategoryLabel', () => {
  it('maps English fee group titles to Chinese', () => {
    expect(feeCategoryLabel('Origin charges')).toBe('起运港费用');
    expect(feeCategoryLabel('Freight charges')).toBe('海运费');
    expect(feeCategoryLabel('Destination charges')).toBe('目的港费用');
    expect(feeCategoryLabel('  other charges ')).toBe('其他费用');
  });

  it('keeps unknown names and fills empty', () => {
    expect(feeCategoryLabel('THC')).toBe('THC');
    expect(feeCategoryLabel('')).toBe('未分类');
    expect(feeCategoryLabel(null)).toBe('未分类');
  });
});
