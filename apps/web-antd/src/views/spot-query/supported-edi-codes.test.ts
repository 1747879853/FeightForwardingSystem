import { describe, expect, it } from 'vitest';

import {
  getSupportedSpotEdiCodeCount,
  isSupportedSpotEdiCode,
} from './supported-edi-codes';

describe('isSupportedSpotEdiCode', () => {
  it('accepts known codes ignoring case and surrounding spaces', () => {
    expect(isSupportedSpotEdiCode('CNTAO')).toBe(true);
    expect(isSupportedSpotEdiCode(' cntao ')).toBe(true);
    expect(isSupportedSpotEdiCode('SGSIN')).toBe(true);
  });

  it('rejects empty or unknown codes', () => {
    expect(isSupportedSpotEdiCode('')).toBe(false);
    expect(isSupportedSpotEdiCode(null)).toBe(false);
    expect(isSupportedSpotEdiCode('XXXXX')).toBe(false);
  });

  it('contains 911 codes from TAPD whitelist', () => {
    expect(getSupportedSpotEdiCodeCount()).toBe(911);
  });
});
