import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

/**
 * 业务联系单费用单位前端仅开放下列四项（固定下拉，便于详情回显）。
 * 审核通过生成应收应付时，后端 `ResolveQuantityByUnit` 精确匹配这些字面量；
 * 箱型名虽也能被后端识别，但费用表不下发箱型选项（详情无法稳定回显）。
 *
 * 注意：业务联系单不支持「件数」计价，海出侧的「毛重 / 尺码」在这里是「重量 / 体积」。
 */
export const PRE_ORDER_GENERIC_UNITS = ['票', '重量', '体积', 'TEU'] as const;

/** 海出与基础数据侧的旧口径单位 → 业务联系单可识别的单位 */
const UNIT_ALIASES: Record<string, string> = {
  CBM: '体积',
  KGS: '重量',
  MEASUREMENT: '体积',
  ORDER: '票',
  TEU: 'TEU',
  WEIGHT: '重量',
  尺码: '体积',
  毛重: '重量',
};

/** 归一别名（毛重→重量 等）；箱型名与无法识别的值原样返回 */
export function normalizePreOrderFeeUnit(unit?: null | string) {
  const raw = (unit ?? '').trim();
  if (raw === '') return '';
  return UNIT_ALIASES[raw] ?? UNIT_ALIASES[raw.toUpperCase()] ?? raw;
}

/**
 * 落到前端可选的四项之一：别名归一后若不在白名单（含历史箱型名），一律改「票」。
 * 空串保持为空，留给校验拦截。
 */
export function coercePreOrderFeeUnit(unit?: null | string) {
  const normalized = normalizePreOrderFeeUnit(unit);
  if (normalized === '') return '';
  if ((PRE_ORDER_GENERIC_UNITS as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return '票';
}

type PreOrderFeeCheckRow = Pick<
  PreOrderAdminApi.PreOrderFeeDto,
  'currencyId' | 'feeCodeId' | 'paySide' | 'quantity' | 'unit'
>;

export interface PreOrderFeeCheckResult {
  /** 会被后端静默丢弃或算成 0 的行，必须先改 */
  errors: string[];
  /** 不阻断提交，但金额大概率不是预期值 */
  warnings: string[];
}

/**
 * 审核通过时后端只取 `feeCodeId + currencyId + paySide` 三者齐全的行（缺一即静默丢弃），
 * 并按 `unit` 重算数量与金额。前端单位仅允许四项固定值。
 */
export function checkPreOrderFees(
  rows: PreOrderFeeCheckRow[],
): PreOrderFeeCheckResult {
  const knownUnits = new Set<string>(PRE_ORDER_GENERIC_UNITS);
  const errors: string[] = [];
  const warnings: string[] = [];
  rows.forEach((row, index) => {
    const label = `第 ${index + 1} 行费用`;
    if (row.paySide == null) errors.push(`${label}：未选择收付类型`);
    if (row.feeCodeId == null) errors.push(`${label}：未选择费用代码`);
    if (row.currencyId == null) errors.push(`${label}：未选择币别`);
    const unit = coercePreOrderFeeUnit(row.unit);
    if (unit === '' || !knownUnits.has(unit)) {
      errors.push(`${label}：未选择单位（可选：票 / 重量 / 体积 / TEU）`);
    }
    if (Number(row.quantity ?? 0) === 0) {
      warnings.push(`${label}：数量为 0，请检查单位或货物信息`);
    }
  });
  return { errors, warnings };
}
