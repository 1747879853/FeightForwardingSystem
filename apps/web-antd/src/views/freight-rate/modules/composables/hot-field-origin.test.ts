import { describe, expect, it } from 'vitest';

import {
  collectFilledOriginKeys,
  markDefaultsFilledOrigins,
  setHotFieldOrigins,
} from './hot-field-origin';

describe('hot-field-origin', () => {
  it('marks AI-filled keys', () => {
    const row: Record<string, any> = {
      carrierId: 'COSCO',
      polId: '',
      voyage: '25',
      ctn_1: 100,
    };
    setHotFieldOrigins(row, collectFilledOriginKeys(row), 'ai');
    expect(row._fieldOrigin).toEqual({
      carrierId: 'ai',
      voyage: 'ai',
      ctn_1: 'ai',
    });
  });

  it('marks only newly filled defaults', () => {
    const before = { carrierId: 'COSCO', currencyId: '', voyage: '' };
    const after = {
      ...before,
      currencyId: 'USD',
      voyage: '30',
      _fieldOrigin: { carrierId: 'ai' },
    };
    markDefaultsFilledOrigins(before, after);
    expect(after._fieldOrigin).toEqual({
      carrierId: 'ai',
      currencyId: 'default',
      voyage: 'default',
    });
  });
});
