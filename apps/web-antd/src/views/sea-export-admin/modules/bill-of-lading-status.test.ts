import { describe, expect, it } from 'vitest';

import {
  formatSeaExportBillStatusSummary,
  toSeaExportBillStatusItems,
} from './bill-of-lading-status';

describe('海运出口列表提单状态', () => {
  it('空数组和 null 都不报错', () => {
    expect(toSeaExportBillStatusItems([])).toEqual([]);
    expect(toSeaExportBillStatusItems(null)).toEqual([]);
    expect(toSeaExportBillStatusItems(undefined)).toEqual([]);
  });

  it('第一条是主单，后面按返回顺序都是分单', () => {
    const items = toSeaExportBillStatusItems([
      { id: 'master', status: 1 },
      { id: 'house-1', status: 0 },
      { id: 'house-2', status: 6 },
    ]);
    expect(items.map((item) => [item.role, item.label, item.color])).toEqual([
      ['主单', '已签入', 'blue'],
      ['分单', '待签入', 'orange'],
      ['分单', '已扣单', 'magenta'],
    ]);
    expect(formatSeaExportBillStatusSummary(items)).toBe(
      '主单 已签入、分单 待签入、分单 已扣单',
    );
  });

  it('只使用状态文案，未知状态保留数字', () => {
    const items = toSeaExportBillStatusItems([
      { id: 'master', status: 3 },
      { id: 'house', status: 9 },
      { id: 'broken', status: null },
    ]);
    expect(items.map((item) => item.label)).toEqual(['签出审核中', '9', '--']);
    expect(items[2]?.role).toBe('分单');
  });
});
