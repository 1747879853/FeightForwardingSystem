import { describe, expect, it } from 'vitest';

import {
  calcOrderFeeProfitRmb,
  collectFeesForPostSubmitProfit,
  isOrderFeeEnteringOrRejectedStatus,
  isOrderFeeRejectedStatus,
  isPostSubmitProfitNegative,
  isSavableOrderFeeRow,
  normalizeOrderFeeChangeOrderKey,
  resolveLatestOrderFeeRejectRemark,
  resolveOrderFeeDisplayStatus,
} from './helpers';

describe('order-fee savable / display status', () => {
  it('展示状态优先 combinedFeeStatus', () => {
    expect(
      resolveOrderFeeDisplayStatus({ combinedFeeStatus: 5, feeStatus: 0 }),
    ).toBe(5);
    expect(resolveOrderFeeDisplayStatus({ feeStatus: 0 })).toBe(0);
  });

  it('录入或驳回（含字符串）', () => {
    expect(isOrderFeeEnteringOrRejectedStatus(0)).toBe(true);
    expect(isOrderFeeEnteringOrRejectedStatus(5)).toBe(true);
    expect(isOrderFeeEnteringOrRejectedStatus('5')).toBe(true);
    expect(isOrderFeeEnteringOrRejectedStatus(6)).toBe(false);
    expect(isOrderFeeEnteringOrRejectedStatus(7)).toBe(false);
  });

  it('可保存行：录入/驳回且未对账；申请修改/删除不可', () => {
    expect(isSavableOrderFeeRow({ feeStatus: 0 })).toBe(true);
    expect(isSavableOrderFeeRow({ combinedFeeStatus: 5, feeStatus: 2 })).toBe(
      true,
    );
    expect(isSavableOrderFeeRow({ feeStatus: 6 })).toBe(false);
    expect(isSavableOrderFeeRow({ feeStatus: 7 })).toBe(false);
    expect(isSavableOrderFeeRow({ feeStatus: 0, isStatemented: true })).toBe(
      false,
    );
    expect(
      isSavableOrderFeeRow({ feeStatus: 0, statements: [{ id: '1' }] }),
    ).toBe(false);
    expect(isSavableOrderFeeRow(null)).toBe(false);
  });
});

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

describe('post-submit profit helpers', () => {
  it('主单更改单归属键归一化', () => {
    expect(normalizeOrderFeeChangeOrderKey(undefined)).toBe('');
    expect(normalizeOrderFeeChangeOrderKey(null)).toBe('');
    expect(normalizeOrderFeeChangeOrderKey('  ')).toBe('');
    expect(normalizeOrderFeeChangeOrderKey('co-1')).toBe('co-1');
  });

  it('提交后利润只含本批提交 + 非录入非驳回，且主单更改单分算', () => {
    const allFees = [
      {
        id: '1',
        paySide: 0,
        amount: 100,
        exchangeRate: 1,
        feeStatus: 2,
        changeOrderId: null,
      },
      {
        id: '2',
        paySide: 1,
        amount: 80,
        exchangeRate: 1,
        feeStatus: 0,
        changeOrderId: null,
      },
      {
        id: '3',
        paySide: 1,
        amount: 50,
        exchangeRate: 1,
        feeStatus: 0,
        changeOrderId: null,
      },
      {
        id: '9',
        paySide: 1,
        amount: 999,
        exchangeRate: 1,
        feeStatus: 2,
        changeOrderId: 'co-1',
      },
    ];
    const submitting = [allFees[2]!];
    const included = collectFeesForPostSubmitProfit(allFees, submitting);
    expect(included.map((f) => f.id).sort()).toEqual(['1', '3']);
    expect(calcOrderFeeProfitRmb(included)).toBe(50);
    expect(isPostSubmitProfitNegative(allFees, submitting)).toBe(false);
  });

  it('提交应付后利润为负时判定为负', () => {
    const allFees = [
      {
        id: '1',
        paySide: 0,
        amount: 100,
        exchangeRate: 1,
        feeStatus: 2,
      },
      {
        id: '2',
        paySide: 1,
        amount: 150,
        exchangeRate: 1,
        feeStatus: 0,
      },
    ];
    expect(isPostSubmitProfitNegative(allFees, [allFees[1]!])).toBe(true);
  });
});
