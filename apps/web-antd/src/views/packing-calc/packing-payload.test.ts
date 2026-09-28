import { describe, expect, it } from 'vitest';

import {
  buildPackingCalculateInput,
  isGravityOffsetWarning,
  matchPresetByName,
  sumCargoDraft,
  toCm,
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
  autoMinContainers: false,
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
    supportLoad: true,
    damaged: false,
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

  it('auto min containers uses max 50', () => {
    const input = buildPackingCalculateInput(
      { ...container, autoMinContainers: true },
      cargos,
    );
    expect(input.maxContainerCount).toBe(50);
  });

  it('applies forklift clearance and cargo expansion into dimensions', () => {
    const input = buildPackingCalculateInput(
      { ...container, forkliftClearance: 10 },
      [{ ...cargos[0]!, expandLength: 2, expandWidth: 1, expandHeight: 3 }],
    );
    expect(input.height).toBe(259);
    expect(input.cargos[0]?.length).toBe(77);
    expect(input.cargos[0]?.width).toBe(66);
    expect(input.cargos[0]?.height).toBe(47);
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

  it('converts units and matches preset names', () => {
    expect(toCm(1, 'm')).toBe(100);
    expect(toCm(10, 'mm')).toBe(1);
    expect(matchPresetByName('40HQ')?.key).toBe('40HQ');
    expect(matchPresetByName('20gp dry')?.key).toBe('20GP');
  });

  it('flags gravity offset beyond ratio', () => {
    expect(isGravityOffsetWarning(150, 1200, 0.1)).toBe(true);
    expect(isGravityOffsetWarning(50, 1200, 0.1)).toBe(false);
  });
});
