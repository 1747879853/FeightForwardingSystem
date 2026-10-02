import { describe, expect, it } from 'vitest';

import {
  calcOrderFeeProfitRmb,
  collectFeesForPostSubmitProfit,
  buildSettlementAutofillValueSet,
  findSettlementClientOption,
  findSettlementDonorRow,
  isOrderFeeEligibleForApplyChange,
  isOrderFeeEnteringOrRejectedStatus,
  isOrderFeeRejectedStatus,
  isPersistedOrderFeeRow,
  isPostSubmitProfitNegative,
  isSavableOrderFeeRow,
  lookupDropdownLabel,
  normalizeOrderFeeChangeOrderKey,
  resolveLatestOrderFeeRejectRemark,
  resolveOrderFeeDisplayStatus,
  resolveSettlementDisplayLabel,
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

  it('已落库判定', () => {
    expect(isPersistedOrderFeeRow({ id: '1' })).toBe(true);
    expect(isPersistedOrderFeeRow({ id: '' })).toBe(false);
    expect(isPersistedOrderFeeRow({ id: null })).toBe(false);
  });

  it('申请改删：审核通过且金额全 0', () => {
    expect(
      isOrderFeeEligibleForApplyChange({
        combinedFeeStatus: 2,
        invoicedAmount: 0,
        orderInvoiceAmount: 0,
        settledAmount: 0,
        rqstPaymentAmount: 0,
      }),
    ).toBe(true);
    expect(
      isOrderFeeEligibleForApplyChange({
        feeStatus: 2,
        settledAmount: 10,
      }),
    ).toBe(false);
    expect(
      isOrderFeeEligibleForApplyChange({
        combinedFeeStatus: 3,
      }),
    ).toBe(false);
  });
});

describe('order-fee select display helpers', () => {
  it('lookupDropdownLabel by value', () => {
    const opts = [
      { label: 'USD', value: 1 },
      { label: 'CNY', value: '2' },
    ];
    expect(lookupDropdownLabel(opts, 1)).toBe('USD');
    expect(lookupDropdownLabel(opts, '2')).toBe('CNY');
    expect(lookupDropdownLabel(opts, 9)).toBe('');
  });

  it('resolveSettlementDisplayLabel prefers cache name', () => {
    expect(
      resolveSettlementDisplayLabel('100', { __settlementName: '测试客户' }),
    ).toBe('测试客户');
    expect(
      resolveSettlementDisplayLabel('100', {}, [
        { value: '100', label: 'C01-测试客户', name: '测试客户' },
      ]),
    ).toBe('测试客户');
  });

  it('buildSettlementAutofillValueSet includes client id for drag-fill', () => {
    const set = buildSettlementAutofillValueSet(
      {
        P: [{ value: 'guid-1', label: 'C01-甲公司', name: '甲公司' }],
      },
      [{ settlementId: 'guid-2', __settlementName: '乙公司' }],
    );
    expect(set.has('guid-1')).toBe(true);
    expect(set.has('C01-甲公司')).toBe(true);
    expect(set.has('甲公司')).toBe(true);
    expect(set.has('guid-2')).toBe(true);
    expect(set.has('乙公司')).toBe(true);
  });

  it('findSettlementClientOption matches id / label / name', () => {
    const map = {
      P: [{ value: 'guid-1', label: 'C01-甲公司', name: '甲公司' }],
    };
    expect(findSettlementClientOption(map, 'guid-1')?.name).toBe('甲公司');
    expect(findSettlementClientOption(map, '甲公司')?.value).toBe('guid-1');
    expect(findSettlementClientOption(map, 'C01-甲公司')?.value).toBe('guid-1');
    expect(findSettlementClientOption(map, 'missing')).toBeUndefined();
  });

  it('findSettlementDonorRow finds filled settlement on table', () => {
    const rows = [
      { settlementId: 'guid-1', __settlementName: '甲公司' },
      { settlementId_value: 'guid-2', __settlementName: '乙公司' },
    ];
    expect(findSettlementDonorRow(rows, 'guid-1')?.__settlementName).toBe(
      '甲公司',
    );
    expect(findSettlementDonorRow(rows, 'guid-2')?.__settlementName).toBe(
      '乙公司',
    );
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
