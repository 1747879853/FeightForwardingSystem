/**
 * 毛重 / 皮重 / 体积 / 费用数量：对齐后端 decimal(20,4)。
 * TAPD #1000905：最多 4 位小数，位数不够时不展示末尾 0。
 */
export const WEIGHT_VOLUME_PRECISION = 4;

type WeightVolumeFormatterInfo = {
  input?: string;
  userTyping?: boolean;
};

/** 四舍五入到 4 位小数，并去掉末尾 0（1.2000 → 1.2） */
export function roundWeightVolume(value: number): number {
  return Number.parseFloat(value.toFixed(WEIGHT_VOLUME_PRECISION));
}

/**
 * InputNumber formatter：输入过程不改写，失焦后最多 4 位且去掉末尾 0。
 */
export function formatWeightVolume(
  value: number | string | undefined,
  info?: WeightVolumeFormatterInfo,
): string {
  if (info?.userTyping) {
    return info.input ?? '';
  }
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return String(roundWeightVolume(num));
}

/** 表格展示：最多 4 位、去尾 0，带千分位 */
export function formatWeightVolumeLocale(
  value: number | string | undefined | null,
): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return roundWeightVolume(num).toLocaleString('zh-CN', {
    maximumFractionDigits: WEIGHT_VOLUME_PRECISION,
    minimumFractionDigits: 0,
  });
}

export const weightVolumeInputNumberProps = {
  formatter: formatWeightVolume,
  precision: WEIGHT_VOLUME_PRECISION,
};
