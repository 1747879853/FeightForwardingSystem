import { describe, expect, it } from 'vitest';

import { normalizePriceDelta } from './freight-price-change';

describe('normalizePriceDelta', () => {
  it('hides null, zero and non-number', () => {
    expect(normalizePriceDelta(null)).toBeUndefined();
    expect(normalizePriceDelta(undefined)).toBeUndefined();
    expect(normalizePriceDelta(0)).toBeUndefined();
    expect(normalizePriceDelta(Number.NaN)).toBeUndefined();
  });

  it('keeps positive and negative deltas', () => {
    expect(normalizePriceDelta(20)).toBe(20);
    expect(normalizePriceDelta(-50.5)).toBe(-50.5);
  });
});
