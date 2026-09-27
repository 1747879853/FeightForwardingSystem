import type { PackingAdminApi } from '#/api/packing/packing-admin';

/** 页面货物行。lineNo 提交时按顺序从 1 编，不在行上持久化。 */
export interface PackingCargoDraft {
  key: string;
  name: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  quantity?: number;
  allowRotate: boolean;
}

export interface PackingContainerDraft {
  length?: number;
  width?: number;
  height?: number;
  limitWeight?: number;
  maxContainerCount?: number;
  selfStack: boolean;
  flatLay: boolean;
  gapLength?: number;
  gapWidth?: number;
}

export const PACKING_PRESETS = [
  { key: '20GP', label: '20GP', length: 589, width: 235, height: 239 },
  { key: '40GP', label: '40GP', length: 1203, width: 235, height: 239 },
  { key: '40HQ', label: '40HQ', length: 1203, width: 235, height: 269 },
] as const;

const MAX_DIM = 5000;
const MAX_WEIGHT = 1_000_000;
const MAX_QTY = 800;

function inOpenRange(value: unknown, max: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= max;
}

export function sumCargoDraft(rows: PackingCargoDraft[]) {
  let quantity = 0;
  let volumeCm3 = 0;
  let weight = 0;
  for (const row of rows) {
    const qty = Number(row.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    quantity += qty;
    const l = Number(row.length);
    const w = Number(row.width);
    const h = Number(row.height);
    if ([l, w, h].every((n) => Number.isFinite(n) && n > 0)) {
      volumeCm3 += l * w * h * qty;
    }
    const pieceWeight = Number(row.weight);
    if (Number.isFinite(pieceWeight) && pieceWeight >= 0) {
      weight += pieceWeight * qty;
    }
  }
  return {
    quantity,
    volumeM3: volumeCm3 / 1_000_000,
    weight,
  };
}

/** 前端校验，文案对齐接口报错，避免无效请求。 */
export function validatePackingDraft(
  container: PackingContainerDraft,
  cargos: PackingCargoDraft[],
): string | null {
  if (!inOpenRange(container.length, MAX_DIM)) {
    return '柜内长必须大于 0 且不超过 5000 厘米';
  }
  if (!inOpenRange(container.width, MAX_DIM)) {
    return '柜内宽必须大于 0 且不超过 5000 厘米';
  }
  if (!inOpenRange(container.height, MAX_DIM)) {
    return '柜内高必须大于 0 且不超过 5000 厘米';
  }
  const limit = Number(container.limitWeight);
  if (!Number.isFinite(limit) || limit < 0 || limit > MAX_WEIGHT) {
    return '限重不能小于 0，且不能超过 1000000 千克';
  }
  const maxCount = Number(container.maxContainerCount);
  if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 50) {
    return '最多开柜数必须在 1 到 50 之间';
  }
  const gapLength = Number(container.gapLength);
  const gapWidth = Number(container.gapWidth);
  if (
    !Number.isFinite(gapLength) ||
    gapLength < 0 ||
    gapLength > MAX_DIM ||
    !Number.isFinite(gapWidth) ||
    gapWidth < 0 ||
    gapWidth > MAX_DIM
  ) {
    return '间隙必须在 0 到 5000 厘米之间';
  }
  if (cargos.length === 0) return '货物清单不能为空';

  let totalQty = 0;
  for (let i = 0; i < cargos.length; i++) {
    const row = cargos[i]!;
    const line = i + 1;
    if (String(row.name ?? '').length > 200) {
      return `第${line}行货物名称不能超过 200 个字符`;
    }
    if (!inOpenRange(row.length, MAX_DIM)) {
      return `第${line}行货物长必须大于 0 且不超过 5000 厘米`;
    }
    if (!inOpenRange(row.width, MAX_DIM)) {
      return `第${line}行货物宽必须大于 0 且不超过 5000 厘米`;
    }
    if (!inOpenRange(row.height, MAX_DIM)) {
      return `第${line}行货物高必须大于 0 且不超过 5000 厘米`;
    }
    const weight = Number(row.weight);
    if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT) {
      return `第${line}行货物单件毛重必须在 0 到 1000000 千克之间`;
    }
    const qty = Number(row.quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY) {
      return `第${line}行货物件数必须大于 0 且不超过 800`;
    }
    totalQty += qty;
  }
  if (totalQty > MAX_QTY) return '全部行件数合计不能超过 800';
  return null;
}

export function buildPackingCalculateInput(
  container: PackingContainerDraft,
  cargos: PackingCargoDraft[],
): PackingAdminApi.PackingCalculateInput {
  return {
    length: Number(container.length),
    width: Number(container.width),
    height: Number(container.height),
    limitWeight: Number(container.limitWeight ?? 0),
    maxContainerCount: Number(container.maxContainerCount),
    selfStack: container.selfStack,
    flatLay: container.flatLay,
    gapLength: Number(container.gapLength ?? 0),
    gapWidth: Number(container.gapWidth ?? 0),
    cargos: cargos.map((row, index) => ({
      lineNo: index + 1,
      name: String(row.name ?? '').trim(),
      length: Number(row.length),
      width: Number(row.width),
      height: Number(row.height),
      weight: Number(row.weight),
      quantity: Number(row.quantity),
      allowRotate: !!row.allowRotate,
    })),
  };
}
