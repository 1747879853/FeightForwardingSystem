import { describe, expect, it } from 'vitest';

import {
  buildPackingCalculateInput,
  sumCargoDraft,
  validatePackingDraft,
  type PackingCargoDraft,
  type PackingContainerDraft,
} from './packing-payload';

const container: PackingContainerDraft = {
  length: 1203,
  width: 235,
  height: 269,
  limitWeight: 0,
  maxContainerCount: 5,
  selfStack: true,
  flatLay: false,
  gapLength: 0,
  gapWidth: 0,
};

const cargos: PackingCargoDraft[] = [
  {
    key: 'a',
    name: 'A',
    length: 75,
    width: 65,
    height: 44,
    weight: 12,
    quantity: 2,
    allowRotate: true,
  },
];

describe('packing payload', () => {
  it('numbers lineNo from 1 in list order', () => {
    const input = buildPackingCalculateInput(container, [
      ...cargos,
      { ...cargos[0]!, key: 'b', name: 'B' },
    ]);
    expect(input.cargos.map((row) => row.lineNo)).toEqual([1, 2]);
    expect(input.length).toBe(1203);
    expect(input.flatLay).toBe(false);
  });

  it('rejects empty cargo list and oversized piece', () => {
    expect(validatePackingDraft(container, [])).toBe('货物清单不能为空');
    expect(
      validatePackingDraft(container, [{ ...cargos[0]!, length: 0 }]),
    ).toContain('第1行货物长');
  });

  it('sums quantity volume and weight from drafts', () => {
    const stats = sumCargoDraft(cargos);
    expect(stats.quantity).toBe(2);
    expect(stats.weight).toBe(24);
    expect(stats.volumeM3).toBeCloseTo((75 * 65 * 44 * 2) / 1_000_000, 6);
  });
});
