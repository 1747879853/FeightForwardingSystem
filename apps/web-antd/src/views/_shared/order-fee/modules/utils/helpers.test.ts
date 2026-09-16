import { describe, expect, it } from 'vitest';

import {
  isOrderFeeRejectedStatus,
  resolveLatestOrderFeeRejectRemark,
} from './helpers';

describe('order-fee reject remark helpers', () => {
  it('识别驳回状态', () => {
    expect(isOrderFeeRejectedStatus(5)).toBe(true);
    expect(isOrderFeeRejectedStatus('5')).toBe(true);
    expect(isOrderFeeRejectedStatus(0)).toBe(false);
    expect(isOrderFeeRejectedStatus(null)).toBe(false);
  });

  it('取最近一次驳回任务的审核意见', () => {
    expect(resolveLatestOrderFeeRejectRemark(null)).toBe('');
    expect(
      resolveLatestOrderFeeRejectRemark({
        submitOrderFeeTasks: [
          {
            taskStatus: 1,
            auditTime: '2026-09-01T10:00:00',
            remark: '旧原因',
          },
          {
            taskStatus: 2,
            auditTime: '2026-09-02T10:00:00',
            remark: '通过意见',
          },
        ],
        modifyOrderFeeTasks: [
          {
            taskStatus: 1,
            auditTime: '2026-09-03T10:00:00',
            remark: '单价不对',
          },
        ],
      }),
    ).toBe('单价不对');
  });

  it('没有驳回任务时返回空串', () => {
    expect(
      resolveLatestOrderFeeRejectRemark({
        submitOrderFeeTasks: [{ taskStatus: 2, remark: 'ok' }],
      }),
    ).toBe('');
  });
});
