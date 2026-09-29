import type { PackingAdminApi } from '#/api/packing/packing-admin';

/** 页面货物行。lineNo 提交时按顺序从 1 编（除非行上显式指定）。 */
export interface PackingCargoDraft {
  key: string;
  name: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  quantity?: number;
  allowRotate: boolean;
  /** 显式行号（导入用）；空则按列表顺序 */
  lineNo?: number;
  groupKey?: string;
  supportLoad: boolean;
  damaged: boolean;
  expandLength?: number;
  expandWidth?: number;
  expandHeight?: number;
}

export interface PackingContainerDraft {
  length?: number;
  width?: number;
  height?: number;
  limitWeight?: number;
  maxContainerCount?: number;
  /** true=用上限 50 开柜，由结果反推最少柜数，无需手填 */
  autoMinContainers: boolean;
  selfStack: boolean;
  flatLay: boolean;
  gapLength?: number;
  gapWidth?: number;
  maxSelfStackLayers?: number;
  forkliftClearance?: number;
}

export type PackingDimUnit = 'cm' | 'mm' | 'm';

export const PACKING_PRESETS = [
  {
    key: '20GP',
    label: '20GP',
    length: 589,
    width: 235,
    height: 239,
    limitWeight: 28_000,
  },
  {
    key: '40GP',
    label: '40GP',
    length: 1203,
    width: 235,
    height: 239,
    limitWeight: 26_000,
  },
  {
    key: '40HQ',
    label: '40HQ',
    length: 1203,
    width: 235,
    height: 269,
    limitWeight: 26_000,
  },
] as const;

export type PackingPresetKey = (typeof PACKING_PRESETS)[number]['key'];

const MAX_DIM = 5000;
const MAX_WEIGHT = 1_000_000;
const MAX_QTY = 800;
const AUTO_MAX_CONTAINERS = 50;

/** 录入单位 → 厘米 */
export function toCm(value: number, unit: PackingDimUnit): number {
  if (unit === 'mm') return value / 10;
  if (unit === 'm') return value * 100;
  return value;
}

/** 厘米 → 录入单位 */
export function fromCm(value: number, unit: PackingDimUnit): number {
  if (unit === 'mm') return value * 10;
  if (unit === 'm') return value / 100;
  return value;
}

export function matchPresetByName(
  name?: null | string,
): (typeof PACKING_PRESETS)[number] | undefined {
  if (!name) return undefined;
  const upper = name.toUpperCase().replaceAll(/\s+/g, '');
  return PACKING_PRESETS.find(
    (p) => upper.includes(p.key) || upper === p.label.toUpperCase(),
  );
}

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

/** 前端校验，文案对齐接口报错，避免无效请求。尺寸字段按厘米。 */
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
  if (!container.autoMinContainers) {
    const maxCount = Number(container.maxContainerCount);
    if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 50) {
      return '最多开柜数必须在 1 到 50 之间';
    }
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
  const clearance = Number(container.forkliftClearance ?? 0);
  if (!Number.isFinite(clearance) || clearance < 0 || clearance > 100) {
    return '叉车顶隙必须在 0 到 100 厘米之间';
  }
  if (clearance > 0 && Number(container.height) - clearance <= 0) {
    return '叉车顶隙不能大于等于柜内高';
  }
  const layers = Number(container.maxSelfStackLayers ?? 0);
  if (!Number.isFinite(layers) || layers < 0 || layers > 100) {
    return '自叠层数必须在 0 到 100 之间（0 表示不限）';
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
    for (const [label, expand] of [
      ['膨胀长', row.expandLength],
      ['膨胀宽', row.expandWidth],
      ['膨胀高', row.expandHeight],
    ] as const) {
      const e = Number(expand ?? 0);
      if (!Number.isFinite(e) || e < 0 || e > 20) {
        return `第${line}行${label}必须在 0 到 20 厘米之间`;
      }
    }
    if (String(row.groupKey ?? '').length > 50) {
      return `第${line}行分组不能超过 50 个字符`;
    }
    totalQty += qty;
  }
  if (totalQty > MAX_QTY) return '全部行件数合计不能超过 800';
  return null;
}

/**
 * 组装接口入参。
 * 叉车顶隙、膨胀在前端折进尺寸，保证旧后端也能生效；扩展字段一并提交供新后端使用。
 */
export function buildPackingCalculateInput(
  container: PackingContainerDraft,
  cargos: PackingCargoDraft[],
): PackingAdminApi.PackingCalculateInput {
  const clearance = Math.max(0, Number(container.forkliftClearance ?? 0));
  const height = Math.max(0.01, Number(container.height) - clearance);
  const maxContainerCount = container.autoMinContainers
    ? AUTO_MAX_CONTAINERS
    : Number(container.maxContainerCount);
  const layers = Number(container.maxSelfStackLayers ?? 0);

  return {
    length: Number(container.length),
    width: Number(container.width),
    height,
    limitWeight: Number(container.limitWeight ?? 0),
    maxContainerCount,
    selfStack: container.selfStack,
    flatLay: container.flatLay,
    gapLength: Number(container.gapLength ?? 0),
    gapWidth: Number(container.gapWidth ?? 0),
    ...(layers > 0 ? { maxSelfStackLayers: layers } : {}),
    ...(clearance > 0 ? { forkliftClearance: clearance } : {}),
    cargos: cargos.map((row, index) => {
      const expandL = Math.max(0, Number(row.expandLength ?? 0));
      const expandW = Math.max(0, Number(row.expandWidth ?? 0));
      const expandH = Math.max(0, Number(row.expandHeight ?? 0));
      const lineNo =
        row.lineNo && row.lineNo > 0 ? Number(row.lineNo) : index + 1;
      return {
        lineNo,
        name: String(row.name ?? '').trim(),
        length: Number(row.length) + expandL,
        width: Number(row.width) + expandW,
        height: Number(row.height) + expandH,
        weight: Number(row.weight),
        quantity: Number(row.quantity),
        allowRotate: !!row.allowRotate,
        ...(row.groupKey?.trim() ? { groupKey: row.groupKey.trim() } : {}),
        supportLoad: row.supportLoad !== false,
        damaged: !!row.damaged,
        ...(expandL > 0 ? { expandLength: expandL } : {}),
        ...(expandW > 0 ? { expandWidth: expandW } : {}),
        ...(expandH > 0 ? { expandHeight: expandH } : {}),
      };
    }),
  };
}

/** 偏载告警：偏移超过柜长/宽的比例阈值（默认 10%） */
export function isGravityOffsetWarning(
  offset: number,
  span: number,
  ratio = 0.1,
): boolean {
  if (!Number.isFinite(offset) || !Number.isFinite(span) || span <= 0) {
    return false;
  }
  return Math.abs(offset) > span * ratio;
}
