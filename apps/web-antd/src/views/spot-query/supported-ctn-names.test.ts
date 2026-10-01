import { describe, expect, it } from 'vitest';

import {
  getSpotCtnSortIndex,
  isSupportedSpotCtnName,
  normalizeSpotCtnName,
  SPOT_SUPPORTED_CTN_NAMES,
} from './supported-ctn-names';

describe('supported-ctn-names', () => {
  it('exposes the expected whitelist order', () => {
    expect([...SPOT_SUPPORTED_CTN_NAMES]).toEqual([
      '20GP',
      '40GP',
      '40HC',
      '45HC',
      '20NOR',
      '40NOR',
      '20RF',
      '40RF',
      '40RH',
      '20OT',
      '40OT',
    ]);
  });

  it('accepts listed names case-insensitively', () => {
    expect(isSupportedSpotCtnName('20gp')).toBe(true);
    expect(isSupportedSpotCtnName(' 40RF ')).toBe(true);
    expect(isSupportedSpotCtnName('40RH')).toBe(true);
    expect(isSupportedSpotCtnName('45HC')).toBe(true);
  });

  it('accepts HQ as alias of HC', () => {
    expect(normalizeSpotCtnName('40HQ')).toBe('40HC');
    expect(normalizeSpotCtnName('45hq')).toBe('45HC');
    expect(isSupportedSpotCtnName('40HQ')).toBe(true);
    expect(isSupportedSpotCtnName('45HQ')).toBe(true);
  });

  it('rejects unsupported names', () => {
    expect(isSupportedSpotCtnName('')).toBe(false);
    expect(isSupportedSpotCtnName(null)).toBe(false);
    expect(isSupportedSpotCtnName('20TK')).toBe(false);
    expect(isSupportedSpotCtnName('40FR')).toBe(false);
  });

  it('sorts by whitelist order', () => {
    expect(getSpotCtnSortIndex('20GP')).toBe(0);
    expect(getSpotCtnSortIndex('40HQ')).toBe(2);
    expect(getSpotCtnSortIndex('40OT')).toBe(10);
    expect(getSpotCtnSortIndex('20TK')).toBe(SPOT_SUPPORTED_CTN_NAMES.length);
  });
});
