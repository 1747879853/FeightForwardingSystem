import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ruleState } = vi.hoisted(() => ({
  ruleState: {
    loaded: true,
    fields: new Map<string, { alwaysMasked: boolean }>(),
  },
}));

vi.mock('#/composables/use-masked-fields', () => ({
  isMaskedFieldsLoaded: () => ruleState.loaded,
  hasMaskRule: (_module: number, propName: string) =>
    ruleState.fields.has(propName.toLowerCase()),
  isAlwaysMasked: (_module: number, propName: string) =>
    ruleState.fields.get(propName.toLowerCase())?.alwaysMasked === true,
}));

vi.mock('#/api/system/permission', () => ({
  FrightModule: {
    OrderFee: 1,
  },
}));

import {
  attachOrderFeeMaskMeta,
  getAlwaysMaskedOrderFeeColumnFields,
  isOrderFeeCellMasked,
  isOrderFeeColumnAlwaysMasked,
  omitMaskedOrderFeeValues,
  ORDER_FEE_MASKED_FIELDS_KEY,
  resolveMaskedOrderFeeFields,
} from './field-permission';

function setRule(propName: string, alwaysMasked: boolean) {
  ruleState.fields.set(propName.toLowerCase(), { alwaysMasked });
}

describe('order-fee field-permission', () => {
  beforeEach(() => {
    ruleState.loaded = true;
    ruleState.fields.clear();
  });

  it('未加载规则时不隐藏、不打码', () => {
    ruleState.loaded = false;
    setRule('SettlementId', true);
    expect(isOrderFeeColumnAlwaysMasked('settlementId')).toBe(false);
    expect(isOrderFeeCellMasked({ feeCodeId: 1 }, 'settlementId')).toBe(false);
  });

  it('非条件屏蔽：整列隐藏，单元格不再打码', () => {
    setRule('SettlementId', true);
    expect(isOrderFeeColumnAlwaysMasked('settlementId')).toBe(true);
    expect(getAlwaysMaskedOrderFeeColumnFields()).toContain('settlementId');
    expect(isOrderFeeCellMasked({ settlementId: '1' }, 'settlementId')).toBe(
      false,
    );
  });

  it('条件屏蔽：key 被剔除时显示 ***，不整列隐藏', () => {
    setRule('SettlementId', false);
    expect(isOrderFeeColumnAlwaysMasked('settlementId')).toBe(false);
    expect(isOrderFeeCellMasked({ remark: 'x' }, 'settlementId')).toBe(true);
    expect(isOrderFeeCellMasked({ settlementId: '1' }, 'settlementId')).toBe(
      false,
    );
    expect(isOrderFeeCellMasked({ settlementId: null }, 'settlementId')).toBe(
      false,
    );
  });

  it('费用代码按 feeCodeId 是否被剔除判定', () => {
    setRule('FeeCodeId', false);
    expect(isOrderFeeCellMasked({ amount: 1 }, 'feeCodeId')).toBe(true);
    expect(isOrderFeeCellMasked({ feeCodeId: 12 }, 'feeCodeId')).toBe(false);
  });

  it('行上挂 _maskedFields 后，normalize 补 key 仍判定为屏蔽', () => {
    setRule('Amount', false);
    const row = attachOrderFeeMaskMeta({ remark: 'x' } as Record<string, any>);
    expect(resolveMaskedOrderFeeFields(row)).toContain('amount');
    row.amount = 0;
    expect(isOrderFeeCellMasked(row, 'amount')).toBe(true);
    expect(row[ORDER_FEE_MASKED_FIELDS_KEY]).toContain('amount');
  });

  it('提交时剔除条件屏蔽与非条件屏蔽字段，避免把 *** 写回', () => {
    setRule('Remark', true);
    const row = attachOrderFeeMaskMeta({
      amount: 10,
      remark: 'keep',
    } as Record<string, any>);
    row._maskedFields = ['settlementId'];
    row.settlementId = '***';
    row.settlementId_value = '1';
    const next = omitMaskedOrderFeeValues(row);
    expect(next.amount).toBe(10);
    expect(next.remark).toBeUndefined();
    expect(next.settlementId).toBeUndefined();
    expect(next.settlementId_value).toBeUndefined();
    expect(next[ORDER_FEE_MASKED_FIELDS_KEY]).toBeUndefined();
  });
});
