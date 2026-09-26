import { describe, expect, it } from 'vitest';

import {
  applyDefaultFreightRateValue,
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
