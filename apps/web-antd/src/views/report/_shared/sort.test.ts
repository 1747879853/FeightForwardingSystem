/**
 * 报表列头排序纯函数测试（TAPD #1001023：三击升序→降序→取消）。
 */
import { describe, expect, it } from 'vitest';

import { applySortToRows, nextSortState, sortCacheKey, sortRows } from './sort';

describe('report sort', () => {
  const rows = [
    { id: '1', amount: '100.00', name: 'B' },
    { id: '2', amount: '', name: 'A' },
    { id: '3', amount: '50.00', name: 'C' },
    { id: '4', amount: '200.00', name: 'D' },
  ];

  it('nextSortState cycles asc → desc → cancel', () => {
    expect(nextSortState(null, 'amount')).toEqual({
      column: 'amount',
      order: 'asc',
    });
    expect(nextSortState({ column: 'amount', order: 'asc' }, 'amount')).toEqual(
      { column: 'amount', order: 'desc' },
    );
    expect(
      nextSortState({ column: 'amount', order: 'desc' }, 'amount'),
    ).toBeNull();
  });

  it('switching column restarts at asc', () => {
    expect(nextSortState({ column: 'amount', order: 'desc' }, 'name')).toEqual({
      column: 'name',
      order: 'asc',
    });
  });

  it('three-click cycle restores original order when always sorting from original', () => {
    const asc = applySortToRows(rows, { column: 'amount', order: 'asc' });
    expect(asc.map((r) => r.id)).toEqual(['3', '1', '4', '2']);

    const desc = applySortToRows(rows, { column: 'amount', order: 'desc' });
    expect(desc.map((r) => r.id)).toEqual(['2', '4', '1', '3']);

    const cancelled = applySortToRows(rows, null);
    expect(cancelled.map((r) => r.id)).toEqual(['1', '2', '3', '4']);
  });

  it('sorting already-sorted data for desc still works, but cancel must use original', () => {
    const asc = sortRows(rows, 'amount', 'asc');
    const descFromAsc = sortRows(asc, 'amount', 'desc');
    // 从已排序结果再降序：空值规则仍成立，但与「从原始降序」可能因稳定排序细节不同；
    // 取消必须拷贝 original，不能依赖「再点一次」反推。
    expect(applySortToRows(rows, null).map((r) => r.id)).toEqual(
      rows.map((r) => r.id),
    );
    expect(descFromAsc.map((r) => r.amount)).toEqual([
      '',
      '200.00',
      '100.00',
      '50.00',
    ]);
  });

  it('sortCacheKey distinguishes sort states with same row count', () => {
    expect(sortCacheKey(null)).toBe('none');
    expect(sortCacheKey({ column: 'amount', order: 'asc' })).toBe('amount:asc');
    expect(sortCacheKey({ column: 'amount', order: 'desc' })).toBe(
      'amount:desc',
    );
    expect(sortCacheKey({ column: 'amount', order: 'asc' })).not.toBe(
      sortCacheKey({ column: 'amount', order: 'desc' }),
    );
  });
});
