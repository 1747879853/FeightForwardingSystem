import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

/**
 * 业务联系单费用单位的通用四项。审核通过生成应收应付时，后端
 * `ResolveQuantityByUnit` 精确匹配这些字面量。
 *
 * 除这四项外，还允许「本单箱型箱量表里出现过的箱型名」（如 20GP）作为单位，
 * 数量取该箱型的箱量合计；箱型名同样能被后端识别。之所以敢开放，是因为箱型
 * 与费用同属一份详情数据，回显时箱型名一定在手，不存在只剩字符串的情况。
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

/** 命中本单箱型时返回箱型表里的原始写法（大小写以箱型字典为准） */
function matchCtnUnit(unit: string, ctnNames?: readonly string[]) {
  if (!ctnNames?.length) return undefined;
  const target = unit.toUpperCase();
  return ctnNames.find((name) => String(name).trim().toUpperCase() === target);
}

/**
 * 落到可选单位：通用四项直接放行，其次匹配本单箱型名，都不中则改「票」。
 * 空串保持为空，留给校验拦截。
 */
export function coercePreOrderFeeUnit(
  unit?: null | string,
  ctnNames?: readonly string[],
) {
  const normalized = normalizePreOrderFeeUnit(unit);
  if (normalized === '') return '';
  if ((PRE_ORDER_GENERIC_UNITS as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return matchCtnUnit(normalized, ctnNames) ?? '票';
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
 * 并按 `unit` 重算数量与金额。单位限通用四项或本单箱型名。
 */
export function checkPreOrderFees(
  rows: PreOrderFeeCheckRow[],
  ctnNames?: readonly string[],
): PreOrderFeeCheckResult {
  const knownUnits = new Set<string>([
    ...PRE_ORDER_GENERIC_UNITS,
    ...(ctnNames ?? []).map((name) => String(name).trim()).filter(Boolean),
  ]);
  const errors: string[] = [];
  const warnings: string[] = [];
  rows.forEach((row, index) => {
    const label = `第 ${index + 1} 行费用`;
    if (row.paySide == null) errors.push(`${label}：未选择收付类型`);
    if (row.feeCodeId == null) errors.push(`${label}：未选择费用代码`);
    if (row.currencyId == null) errors.push(`${label}：未选择币别`);
    const unit = coercePreOrderFeeUnit(row.unit, ctnNames);
    if (unit === '' || !knownUnits.has(unit)) {
      errors.push(
        `${label}：未选择单位（可选：票 / 重量 / 体积 / TEU 或本单箱型）`,
      );
    }
    if (Number(row.quantity ?? 0) === 0) {
      warnings.push(`${label}：数量为 0，请检查单位或货物信息`);
    }
  });
  return { errors, warnings };
}
