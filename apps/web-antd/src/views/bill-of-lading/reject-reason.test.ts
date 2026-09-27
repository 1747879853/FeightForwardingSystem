import type { BillOfLading } from '#/api/bill-of-lading';

import { describe, expect, it } from 'vitest';

import { rejectMeta, rejectReasonOf, rejectReasonText } from './reject-reason';

function bill(overrides: Partial<BillOfLading> = {}): BillOfLading {
  return {
    id: 'bill-1',
    status: 2,
    isOriginal: true,
    isSeparate: false,
    isOverdue: false,
    seaExport: { id: 'order-1', transportOrder: { id: 'order-1' } },
    ...overrides,
  };
}

describe('提单驳回原因', () => {
  it('只有已驳回才展示', () => {
    expect(rejectReasonOf(bill({ status: 1, auditRemark: '上一轮' }))).toBe(
      undefined,
    );
    expect(rejectReasonOf(bill({ status: 3, auditRemark: '审核中' }))).toBe(
      undefined,
    );
  });

  it('空意见显示未填写，并带上审核人和时间', () => {
    const reason = rejectReasonOf(
      bill({
        auditRemark: '  ',
        auditTime: '2026-09-27T13:58:26',
        auditUserName: ' 李飞 ',
      }),
    );
    expect(rejectReasonText(reason)).toBe('未填写');
    expect(rejectMeta(reason)).toBe('李飞 · 2026-09-27 13:58:26');
  });

  it('从没提交过时意见为空，仍按未填写展示', () => {
    const reason = rejectReasonOf(
      bill({ auditRemark: null, auditTime: null, auditUserName: null }),
    );
    expect(rejectReasonText(reason)).toBe('未填写');
    expect(rejectMeta(reason)).toBe('');
  });

  it('展示最近一次审核意见原文', () => {
    const reason = rejectReasonOf(bill({ auditRemark: '资料不全' }));
    expect(rejectReasonText(reason)).toBe('资料不全');
  });
});
