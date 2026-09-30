import { isReactive, isShallow, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
  applySortIndicators,
  createPagedListQuery,
  parseAbpSorting,
  parseVxeDefaultSort,
  syncGridSortFromSession,
} from './paged-list-query';

describe('paged-list-query sort indicators', () => {
  it('前端列字段 defaultSort 解析后仍能对上起飞日期列', () => {
    expect(parseAbpSorting('transportOrder.etd DESC')).toEqual([
      { field: 'transportOrder.etd', order: 'desc' },
    ]);
  });

  it('全大写 ETD 不能当列字段：pascalToCamel 会变成 eTD', () => {
    expect(parseAbpSorting('TransportOrder.ETD DESC')).toEqual([
      { field: 'transportOrder.eTD', order: 'desc' },
    ]);
  });

  it('用 setSort(..., false) 补箭头，不 clearSort', () => {
    const grid = {
      setSort: vi.fn(),
      clearSort: vi.fn(),
      sort: vi.fn(),
    };
    syncGridSortFromSession(grid, [
      { field: 'transportOrder.etd', order: 'desc' },
    ]);
    expect(grid.setSort).toHaveBeenCalledWith(
      { field: 'transportOrder.etd', order: 'desc' },
      false,
    );
    expect(grid.clearSort).not.toHaveBeenCalled();
    expect(grid.sort).not.toHaveBeenCalled();
  });

  it('多列排序一次交给 setSort', () => {
    const grid = { setSort: vi.fn() };
    applySortIndicators(grid, [
      { field: 'transportOrder.etd', order: 'desc' },
      { field: 'creationTime', order: 'asc' },
    ]);
    expect(grid.setSort).toHaveBeenCalledWith(
      [
        { field: 'transportOrder.etd', order: 'desc' },
        { field: 'creationTime', order: 'asc' },
      ],
      false,
    );
  });

  it('parseVxeDefaultSort 忽略非法项', () => {
    expect(
      parseVxeDefaultSort({ field: 'transportOrder.etd', order: 'desc' }),
    ).toEqual([{ field: 'transportOrder.etd', order: 'desc' }]);
    expect(parseVxeDefaultSort({ field: 'etd', order: 'none' })).toEqual([]);
    expect(parseVxeDefaultSort(undefined)).toEqual([]);
  });
});

describe('paged-list-query 浅响应式', () => {
  it('行本身响应式，嵌套对象不再包进去', async () => {
    const query = createPagedListQuery(async () => ({
      items: [{ id: '1', transportOrder: { mblNum: 'A' } }],
      totalCount: 1,
    }));
    const result = await query({ page: { currentPage: 1, pageSize: 200 } }, {});
    const row = result.items[0];
    expect(isReactive(row)).toBe(true);
    expect(isShallow(row)).toBe(true);
    expect(isReactive(row.transportOrder)).toBe(false);
    const loaded = reactive(result.items);
    expect(isShallow(loaded[0])).toBe(true);
    expect(isReactive(loaded[0].transportOrder)).toBe(false);
    expect(row.transportOrder.mblNum).toBe('A');
  });
});
