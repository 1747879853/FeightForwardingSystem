import type {
  PackingCargoDraft,
  PackingContainerDraft,
  PackingPresetKey,
} from './packing-payload';

import { buildBrandStorageKey } from '#/utils/brand-storage';

const PREFILL_KEY = () => buildBrandStorageKey('packing-calc:prefill');
const DRAFT_KEY = () => buildBrandStorageKey('packing-calc:draft');

export interface PackingPrefillPayload {
  source?: 'manual' | 'seaExport';
  seaExportId?: string;
  commissionNum?: string;
  presetKey?: PackingPresetKey;
  container?: Partial<PackingContainerDraft>;
  cargos?: PackingCargoDraft[];
  /** 建议回写用的箱型名 */
  suggestCtnName?: string;
}

export interface PackingDraftPayload {
  container: PackingContainerDraft;
  cargos: PackingCargoDraft[];
  presetKey?: PackingPresetKey;
  dimUnit?: 'cm' | 'mm' | 'm';
  savedAt: string;
}

export function stashPackingPrefill(payload: PackingPrefillPayload) {
  try {
    sessionStorage.setItem(PREFILL_KEY(), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function consumePackingPrefill(): null | PackingPrefillPayload {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY());
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY());
    return JSON.parse(raw) as PackingPrefillPayload;
  } catch {
    return null;
  }
}

export function savePackingDraft(
  payload: Omit<PackingDraftPayload, 'savedAt'>,
) {
  try {
    localStorage.setItem(
      DRAFT_KEY(),
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
    );
  } catch {
    // ignore
  }
}

export function loadPackingDraft(): null | PackingDraftPayload {
  try {
    const raw = localStorage.getItem(DRAFT_KEY());
    if (!raw) return null;
    return JSON.parse(raw) as PackingDraftPayload;
  } catch {
    return null;
  }
}

export function clearPackingDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY());
  } catch {
    // ignore
  }
}

/** 海出件毛体粗估单件尺寸（等体积立方体），无件长宽高主数据时的兜底 */
export function estimatePieceFromTotals(input: {
  pkgs?: null | number;
  kgs?: null | number;
  cbm?: null | number;
  goodsDes?: null | string;
}): PackingCargoDraft | null {
  const pkgs = Number(input.pkgs);
  if (!Number.isFinite(pkgs) || pkgs <= 0) return null;
  const cbm = Number(input.cbm);
  const kgs = Number(input.kgs);
  const volumeCm3 =
    Number.isFinite(cbm) && cbm > 0 ? (cbm / pkgs) * 1_000_000 : 50 * 40 * 30;
  const side = Math.cbrt(volumeCm3);
  const weight =
    Number.isFinite(kgs) && kgs >= 0 ? Math.round((kgs / pkgs) * 100) / 100 : 0;
  return {
    key: `from-order-${Date.now()}`,
    name: String(input.goodsDes ?? '').trim() || '订单货物',
    length: Math.round(side * 10) / 10,
    width: Math.round(side * 10) / 10,
    height: Math.round(side * 10) / 10,
    weight,
    quantity: Math.trunc(pkgs),
    allowRotate: true,
    supportLoad: true,
    damaged: false,
  };
}
