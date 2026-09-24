import { describe, expect, it } from 'vitest';

import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';

import { buildFreightQuoteText } from './build-freight-quote-text';

describe('buildFreightQuoteText', () => {
  it('builds default quote text from a freight rate row', () => {
    const row = {
      isDirect: false,
      voyage: '25',
      poddet: 14,
      remark: '含 THC',
      carrier: { cnName: 'MCC 马士基（中国）航运有限公司代理MCC航运业务' },
      pol: { portName: 'QINGDAO', cnName: '青岛' },
      pod: { portName: 'BELAWAN', cnName: '勿拉湾' },
      country: { countryName: '印度尼西亚', countryEnName: 'INDONESIA' },
      currency: { code: 'USD', name: '美元', symbol: '$' },
      poT1: {
        portName: 'MYTPP',
        cnName: '丹戎帕拉帕斯港(TANJUNG PELEPAS的简写)',
      },
      seFreiPriceDays: [{ etd: '2026-10-05T00:00:00' }],
      seFreiPriceCtns: [
        { ctnCodeId: 1, sugPrice: 0, ctnCode: { ctnName: '20GP' } },
      ],
      seFreiPriceFees: [{ feeCodeId: 1 }],
    } as unknown as SeFreiPriceOutDto;

    const text = buildFreightQuoteText(row);

    expect(text).toContain(
      '船公司：MCC 马士基（中国）航运有限公司代理MCC航运业务',
    );
    expect(text).toContain('起运港：QINGDAO-青岛');
    expect(text).toContain('目的港：BELAWAN-勿拉湾');
    expect(text).toContain('国家：印度尼西亚/INDONESIA');
    expect(text).toContain('是否直达：否');
    expect(text).toContain(
      '中转港1：MYTPP-丹戎帕拉帕斯港(TANJUNG PELEPAS的简写)',
    );
    expect(text).toContain('中转港2：-');
    expect(text).toContain('开船日期：2026-10-05');
    expect(text).toContain('航程：25');
    expect(text).toContain('目的港免箱期：14');
    expect(text).toContain('币别：USD');
    expect(text).toContain('海运费：20GP 指导价：$0');
    expect(text).toContain('附加费：含 THC');
    expect(text).not.toContain('费用1');
  });
});
