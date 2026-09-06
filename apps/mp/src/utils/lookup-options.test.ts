import { describe, expect, it } from 'vitest';

import {
  mapCarrierOptions,
  mapGoodsOptions,
  mapPortOptions,
  sliceNamedOptions,
} from './lookup-options';

describe('lookup option mappers', () => {
  it('港口对齐 PC 两行：EDI/英文名 + 国家/中文名', () => {
    expect(
      mapPortOptions([
        {
          id: 11,
          ediCode: 'CNSHA',
          portName: 'SHANGHAI',
          cnName: '上海',
          country: { countryEnName: 'CHINA' },
        },
        { id: '', portName: 'SKIP' },
      ]),
    ).toEqual([
      {
        desc: 'CHINA / 上海',
        id: '11',
        name: 'CNSHA/SHANGHAI',
      },
    ]);
  });

  it('船公司对齐 PC：CODE(简称)', () => {
    expect(
      mapCarrierOptions([
        { id: 3, cnName: '马士基', cnShortName: 'MSK', code: 'MAEU' },
      ]),
    ).toEqual([{ id: '3', name: 'MAEU(MSK)' }]);
  });

  it('品名优先中文名', () => {
    expect(mapGoodsOptions([{ id: 8, code: 'G1', name: '服装' }])).toEqual([
      { id: '8', name: '服装' },
    ]);
  });

  it('本地关键字过滤后再分页', () => {
    const items = [
      { id: '1', name: '上海' },
      { id: '2', name: '宁波' },
      { id: '3', name: '深圳' },
    ];
    expect(sliceNamedOptions(items, 1, 1, '海')).toEqual({
      items: [{ id: '1', name: '上海' }],
      totalCount: 1,
    });
    expect(sliceNamedOptions(items, 2, 1, '')).toEqual({
      items: [{ id: '2', name: '宁波' }],
      totalCount: 3,
    });
    expect(
      sliceNamedOptions(
        [{ desc: 'CHINA / 上海', id: '11', name: 'CNSHA/SHANGHAI' }],
        1,
        10,
        'china',
      ).totalCount,
    ).toBe(1);
  });
});
