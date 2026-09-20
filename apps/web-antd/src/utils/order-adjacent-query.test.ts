import { afterEach, describe, expect, it } from 'vitest';

import {
  buildOrderDetailParams,
  hasRepeatableQueryArray,
  normalizeAdjacentId,
  readOrderAdjacentQuery,
  rememberOrderAdjacentQuery,
  sanitizeAdjacentQuery,
} from './order-adjacent-query';

afterEach(() => {
  sessionStorage.clear();
});

describe('sanitizeAdjacentQuery', () => {
  it('去掉分页和空值，保留筛选与排序', () => {
    expect(
      sanitizeAdjacentQuery({
        pageIndex: 2,
        pageSize: 20,
        PageIndex: 3,
        Keyword: 'EVER',
        Keys: ['A', 'B'],
        sorting: 'TransportOrder.Etd DESC',
        Vessel: '',
        SaleId: undefined,
        YardIdEmpty: false,
      }),
    ).toEqual({
      Keyword: 'EVER',
      Keys: ['A', 'B'],
      sorting: 'TransportOrder.Etd DESC',
      YardIdEmpty: false,
    });
  });
});

describe('order adjacent query storage', () => {
  it('记忆后再读回同一套筛选', () => {
    rememberOrderAdjacentQuery('sea-export', {
      pageIndex: 1,
      pageSize: 10,
      Keyword: 'MSC',
      sorting: 'CreationTime DESC',
    });
    expect(readOrderAdjacentQuery('sea-export')).toEqual({
      Keyword: 'MSC',
      sorting: 'CreationTime DESC',
    });
    expect(readOrderAdjacentQuery('sea-import')).toEqual({});
  });
});

describe('buildOrderDetailParams', () => {
  it('当前票 Id 覆盖列表里误带的 Id，打印时加 IsPrint', () => {
    expect(
      buildOrderDetailParams('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', {
        isPrint: true,
        listQuery: {
          Id: 'old',
          Keyword: 'EVER',
          Keys: ['X'],
        },
      }),
    ).toEqual({
      Keyword: 'EVER',
      Keys: ['X'],
      Id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      IsPrint: true,
    });
  });
});

describe('normalizeAdjacentId / hasRepeatableQueryArray', () => {
  it('空 Guid 与空串视为没有上一票/下一票', () => {
    expect(normalizeAdjacentId(null)).toBeNull();
    expect(normalizeAdjacentId('')).toBeNull();
    expect(
      normalizeAdjacentId('00000000-0000-0000-0000-000000000000'),
    ).toBeNull();
    expect(normalizeAdjacentId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')).toBe(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    );
  });

  it('数组参数需要 repeat 序列化', () => {
    expect(hasRepeatableQueryArray({ Keys: ['a'] })).toBe(true);
    expect(hasRepeatableQueryArray({ Keyword: 'a' })).toBe(false);
  });
});
