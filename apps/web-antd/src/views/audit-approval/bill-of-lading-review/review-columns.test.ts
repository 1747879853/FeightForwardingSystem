import { describe, expect, it } from 'vitest';

import {
  compactReviewColumns,
  sumUnreceivedByCurrency,
  tableScrollWidth,
} from './review-columns';

const columns = [
  {
    title: '压单',
    key: 'held',
    dataIndex: ['billOfLading', 'isHeldUp'],
    width: 72,
  },
  {
    title: '分提单号',
    dataIndex: ['billOfLading', 'seaExportSeparate', 'blNum'],
    width: 150,
  },
  {
    title: '结算对象',
    dataIndex: ['billOfLading', 'settlement', 'name'],
    width: 160,
  },
  {
    title: '超期备注',
    dataIndex: ['billOfLading', 'overdueRemark'],
    width: 180,
  },
  { title: '审核人', dataIndex: 'auditUserName', width: 100 },
  { title: '审核意见', dataIndex: 'remark', width: 160 },
  {
    title: '主提单号',
    dataIndex: ['billOfLading', 'seaExport', 'transportOrder', 'mblNum'],
    width: 170,
  },
];

describe('compactReviewColumns', () => {
  it('hides blank optional columns and a uniform settlement', () => {
    const rows = [
      {
        auditUserName: '',
        remark: null,
        billOfLading: {
          isHeldUp: false,
          overdueRemark: '  ',
          seaExportSeparate: null,
          settlement: { name: '宜必思酒业' },
        },
      },
    ];
    const visible = compactReviewColumns(columns, rows, {
      hideUniformSettlement: true,
    }).map((column) => column.title);
    expect(visible).toEqual(['主提单号']);
  });

  it('keeps a held tag, a real sub bill number, and mixed settlements', () => {
    const rows = [
      {
        auditUserName: '张三',
        remark: '资料不全',
        billOfLading: {
          isHeldUp: true,
          overdueRemark: '',
          seaExportSeparate: { blNum: 'HBL1' },
          settlement: { name: '甲' },
        },
      },
      {
        billOfLading: {
          isHeldUp: false,
          settlement: { name: '乙' },
        },
      },
    ];
    const visible = compactReviewColumns(columns, rows, {
      hideUniformSettlement: true,
    }).map((column) => column.title);
    expect(visible).toEqual([
      '压单',
      '分提单号',
      '结算对象',
      '审核人',
      '审核意见',
      '主提单号',
    ]);
  });
});

describe('sumUnreceivedByCurrency', () => {
  it('sums by local currency and keeps overdue separate', () => {
    const rows = [
      { localCurrencyCode: 'RMB', overdueDays: 3, totalUnReceived: 100 },
      { localCurrencyCode: 'RMB', overdueDays: -2, totalUnReceived: 40 },
      { localCurrencyCode: 'USD', overdueDays: 1, totalUnReceived: 5 },
      { localCurrencyCode: 'USD', overdueDays: 8, totalUnReceived: 0 },
    ];
    expect(sumUnreceivedByCurrency(rows)).toEqual([
      { code: 'RMB', amount: 140 },
      { code: 'USD', amount: 5 },
    ]);
    expect(sumUnreceivedByCurrency(rows, true)).toEqual([
      { code: 'RMB', amount: 100 },
      { code: 'USD', amount: 5 },
    ]);
  });
});

describe('tableScrollWidth', () => {
  it('adds the selection column width', () => {
    expect(tableScrollWidth([{ width: 100 }, { width: 50 }], true)).toBe(212);
    expect(tableScrollWidth([{ width: 100 }])).toBe(100);
  });
});
