import type { PackingAdminApi } from '#/api/packing/packing-admin';

import { calculatePacking } from '#/api/packing/packing-admin';

import {
  buildPackingCalculateInput,
  PACKING_PRESETS,
  type PackingCargoDraft,
  type PackingContainerDraft,
  type PackingPresetKey,
} from './packing-payload';

export interface PackingCompareRow {
  key: PackingPresetKey;
  label: string;
  length: number;
  width: number;
  height: number;
  limitWeight: number;
  containerCount: number;
  placedQuantity: number;
  unplacedQuantity: number;
  avgVolumeRate: number;
  avgWeightRate: number;
  ok: boolean;
  result: PackingAdminApi.PackingCalculateResult;
}

/** 同一票货并行试算多个标准柜型，供对比选用 */
export async function comparePackingPresets(
  base: PackingContainerDraft,
  cargos: PackingCargoDraft[],
  keys: PackingPresetKey[] = ['20GP', '40GP', '40HQ'],
): Promise<PackingCompareRow[]> {
  const jobs = keys.map(async (key) => {
    const preset = PACKING_PRESETS.find((p) => p.key === key)!;
    const container: PackingContainerDraft = {
      ...base,
      length: preset.length,
      width: preset.width,
      height: preset.height,
      limitWeight:
        Number(base.limitWeight) > 0
          ? Number(base.limitWeight)
          : preset.limitWeight,
      autoMinContainers: true,
      maxContainerCount: 50,
    };
    const result = await calculatePacking(
      buildPackingCalculateInput(container, cargos),
    );
    const boxes = result.containers ?? [];
    const avgVolumeRate =
      boxes.length === 0
        ? 0
        : boxes.reduce((s, b) => s + (b.volumeRate || 0), 0) / boxes.length;
    const avgWeightRate =
      boxes.length === 0
        ? 0
        : boxes.reduce((s, b) => s + (b.weightRate || 0), 0) / boxes.length;
    return {
      key,
      label: preset.label,
      length: preset.length,
      width: preset.width,
      height: preset.height,
      limitWeight: container.limitWeight ?? 0,
      containerCount: result.containerCount,
      placedQuantity: result.placedQuantity,
      unplacedQuantity: result.unplacedQuantity,
      avgVolumeRate: Math.round(avgVolumeRate * 10) / 10,
      avgWeightRate: Math.round(avgWeightRate * 10) / 10,
      ok: result.unplacedQuantity === 0 && result.containerCount > 0,
      result,
    } satisfies PackingCompareRow;
  });
  return Promise.all(jobs);
}
