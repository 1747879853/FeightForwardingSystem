import { describe, expect, it } from 'vitest';

import {
  applyDefaultFreightRateValue,
  isEmptyFreightDefaultField,
  type DefaultFreightRateValue,
} from './use-default-freight-rate-config';

describe('applyDefaultFreightRateValue', () => {
  const defaults: DefaultFreightRateValue = {
    isDirect: false,
    currencyId: 1,
    carrierId: 10,
    polId: 20,
    voyage: '25',
    remark: '默认备注',
  };

  it('fills empty fields from defaults', () => {
    const row = applyDefaultFreightRateValue(
      { carrierId: '', voyage: '', remark: '' },
      defaults,
    );
    expect(row.carrierId).toBe(10);
    expect(row.voyage).toBe('25');
    expect(row.remark).toBe('默认备注');
    expect(row.isDirect).toBe(false);
    expect(row.currencyId).toBe(1);
    expect(row.polId).toBe(20);
  });

  it('fills form placeholder 0 ids (add-modal seed)', () => {
    // 运价新增弹窗曾用 carrierId:0 等占位，fill-blank 后个人默认值进不去
    const row = applyDefaultFreightRateValue(
      {
        recommend: false,
        carrierId: 0,
        polId: 0,
        podId: 0,
        isDirect: true,
        currencyId: 0,
      },
      defaults,
    );
    expect(row.carrierId).toBe(10);
    expect(row.polId).toBe(20);
    expect(row.currencyId).toBe(1);
    // boolean 已有值不算空，仍保留种子（弹窗改为不预填 isDirect）
    expect(row.isDirect).toBe(true);
  });

  it('does not overwrite non-empty AI / user values', () => {
    const row = applyDefaultFreightRateValue(
      {
        carrierId: 'COSCO',
        voyage: '18',
        isDirect: true,
        remark: 'AI备注',
      },
      defaults,
    );
    expect(row.carrierId).toBe('COSCO');
    expect(row.voyage).toBe('18');
    expect(row.isDirect).toBe(true);
    expect(row.remark).toBe('AI备注');
    expect(row.currencyId).toBe(1);
    expect(row.polId).toBe(20);
  });
});

describe('isEmptyFreightDefaultField', () => {
  it('treats 0 as empty placeholder id', () => {
    expect(isEmptyFreightDefaultField(0)).toBe(true);
    expect(isEmptyFreightDefaultField('')).toBe(true);
    expect(isEmptyFreightDefaultField(null)).toBe(true);
    expect(isEmptyFreightDefaultField(undefined)).toBe(true);
    expect(isEmptyFreightDefaultField(10)).toBe(false);
    expect(isEmptyFreightDefaultField(false)).toBe(false);
    expect(isEmptyFreightDefaultField(true)).toBe(false);
  });
});
