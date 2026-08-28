import { describe, expect, it } from 'vitest';

import {
  isOrderFeeApprovedForPayment,
  validateOrderFeesForPaymentApplication,
} from './open-from-order-fees';

describe('isOrderFeeApprovedForPayment', () => {
  it('审核通过可通过', () => {
    expect(isOrderFeeApprovedForPayment({ combinedFeeStatus: 2 })).toBe(true);
  });

  it('部分结算可通过', () => {
    expect(isOrderFeeApprovedForPayment({ combinedFeeStatus: 3 })).toBe(true);
  });

  it('提交审核不可通过', () => {
    expect(isOrderFeeApprovedForPayment({ combinedFeeStatus: 1 })).toBe(false);
  });

  it('申请修改不可通过（即使 feeStatus 仍为 2）', () => {
    expect(isOrderFeeApprovedForPayment({ combinedFeeStatus: 6 })).toBe(false);
  });

  it('无 combinedFeeStatus 时回退 feeStatus=2 可通过', () => {
    expect(isOrderFeeApprovedForPayment({ feeStatus: 2 })).toBe(true);
  });

  it('无 combinedFeeStatus 但有待审修改任务不可通过', () => {
    expect(
      isOrderFeeApprovedForPayment({
        feeStatus: 2,
        modifyOrderFeeTasks: [{ taskStatus: 0 }],
      }),
    ).toBe(false);
  });

  it('不回退 feeStatus：仅 feeStatus=2 时不可通过', () => {
    expect(isOrderFeeApprovedForPayment({})).toBe(false);
  });
});

describe('validateOrderFeesForPaymentApplication', () => {
  it('空列表返回提示', () => {
    expect(validateOrderFeesForPaymentApplication([])).toBe(
      '请先勾选已保存的费用',
    );
  });

  it('未审核通过不可跳转', () => {
    expect(
      validateOrderFeesForPaymentApplication([
        { id: '1', paySide: 1, settlementId: 'a', combinedFeeStatus: 1 },
      ]),
    ).toBe('只有审核通过（或部分结算且仍有额度）的费用可申请付费，请重新勾选');
  });

  it('申请修改不可跳转', () => {
    expect(
      validateOrderFeesForPaymentApplication([
        {
          id: '1',
          paySide: 1,
          settlementId: 'a',
          combinedFeeStatus: 6,
          feeStatus: 2,
        },
      ]),
    ).toBe('所选费用正在申请修改，请等待审批完成后再申请付费');
  });

  it('申请删除不可跳转', () => {
    expect(
      validateOrderFeesForPaymentApplication([
        { id: '1', paySide: 1, settlementId: 'a', combinedFeeStatus: 7 },
      ]),
    ).toBe('所选费用正在申请删除，请等待审批完成后再申请付费');
  });

  it('多结算对象不可跳转', () => {
    expect(
      validateOrderFeesForPaymentApplication([
        {
          id: '1',
          paySide: 1,
          settlementId: 'a',
          combinedFeeStatus: 2,
        },
        {
          id: '2',
          paySide: 1,
          settlementId: 'b',
          combinedFeeStatus: 2,
        },
      ]),
    ).toBe('所选费用结算对象不一致，请只选择同一结算对象的费用');
  });

  it('全应收不可跳转', () => {
    expect(
      validateOrderFeesForPaymentApplication([
        { id: '1', paySide: 0, settlementId: 'a', combinedFeeStatus: 2 },
      ]),
    ).toBe('请至少选择一条应付费用');
  });

  it('同结算对象且含应付已通过', () => {
    expect(
      validateOrderFeesForPaymentApplication([
        {
          id: '1',
          paySide: 0,
          settlementId: 'a',
          combinedFeeStatus: 2,
        },
        {
          id: '2',
          paySide: 1,
          settlementId: 'a',
          combinedFeeStatus: 2,
        },
      ]),
    ).toBeNull();
  });
});
