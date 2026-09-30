import { describe, expect, it } from 'vitest';

import { arrangeReportColumns, mergeVisualColumnOrder } from './column-layout';

describe('arrangeReportColumns', () => {
  it('puts left-fixed first and right-fixed last, skipping hidden columns', () => {
    const arranged = arrangeReportColumns([
      { data: 'a', order: 0, visible: true, fixed: false },
      { data: 'b', order: 1, visible: false, fixed: false },
      { data: 'c', order: 2, visible: true, fixed: 'right' },
      { data: 'd', order: 3, visible: true, fixed: 'left' },
    ]);
    expect(arranged.columns.map((col) => col.data)).toEqual(['d', 'a', 'c']);
    expect(arranged.fixedColumnsLeft).toBe(1);
    expect(arranged.fixedColumnsRight).toBe(1);
  });

  it('keeps hidden columns when includeHidden is true', () => {
    const arranged = arrangeReportColumns(
      [
        { data: 'a', order: 0, visible: true },
        { data: 'b', order: 1, visible: false },
      ],
      { includeHidden: true },
    );
    expect(arranged.columns.map((col) => col.data)).toEqual(['a', 'b']);
  });
});

describe('mergeVisualColumnOrder', () => {
  it('reorders visible columns and keeps hidden columns in their slots', () => {
    const columns = [
      { data: 'a', order: 0, visible: true },
      { data: 'hidden', order: 1, visible: false },
      { data: 'b', order: 2, visible: true },
      { data: 'c', order: 3, visible: true },
    ];
    const next = mergeVisualColumnOrder(columns, ['c', 'a', 'b']);
    expect(next.map((col) => col.data)).toEqual(['c', 'hidden', 'a', 'b']);
    expect(next.map((col) => col.order)).toEqual([0, 1, 2, 3]);
  });
});
