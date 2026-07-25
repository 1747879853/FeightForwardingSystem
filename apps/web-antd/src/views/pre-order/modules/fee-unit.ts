import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

/**
 * 业务联系单费用单位是与后端的硬契约：审核通过生成应收应付时，后端
 * `ResolveQuantityByUnit` 精确匹配下列字面量，其余字符串一律按箱型名匹配，
 * 匹配不上即按数量 0 落库（金额随之为 0）。后端不做任何别名映射。
 *
 * 注意：业务联系单不支持「件数」计价，海出侧的「毛重 / 尺码」在这里是「重量 / 体积」。
 */
export const PRE_ORDER_GENERIC_UNITS = ['票', '重量', '体积', 'TEU'];

/** 海出与基础数据侧的旧口径单位 → 业务联系单后端可识别的单位 */
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

/** 归一到后端契约字面量；箱型名与无法识别的值原样返回 */
export function normalizePreOrderFeeUnit(unit?: null | string) {
  const raw = (unit ?? '').trim();
  if (raw === '') return '';
  return UNIT_ALIASES[raw] ?? UNIT_ALIASES[raw.toUpperCase()] ?? raw;
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
 * 并按 `unit` 重算数量与金额，这里提前把会丢失或算成 0 的行捞出来。
 */
export function checkPreOrderFees(
  rows: PreOrderFeeCheckRow[],
  ctnNames: string[] = [],
): PreOrderFeeCheckResult {
  const knownUnits = new Set([...PRE_ORDER_GENERIC_UNITS, ...ctnNames]);
  const errors: string[] = [];
  const warnings: string[] = [];
  rows.forEach((row, index) => {
    const label = `第 ${index + 1} 行费用`;
    if (row.paySide == null) errors.push(`${label}：未选择收付类型`);
    if (row.feeCodeId == null) errors.push(`${label}：未选择费用代码`);
    if (row.currencyId == null) errors.push(`${label}：未选择币别`);
    const unit = normalizePreOrderFeeUnit(row.unit);
    if (unit === '') {
      errors.push(`${label}：未选择单位`);
    } else if (!knownUnits.has(unit)) {
      errors.push(
        `${label}：单位「${unit}」不在后端可识别范围（票 / 重量 / 体积 / TEU / 箱型名），审核通过后数量与金额会算成 0`,
      );
    }
    if (Number(row.quantity ?? 0) === 0) {
      warnings.push(`${label}：按当前单位带出的数量为 0，金额将为 0`);
    }
  });
  return { errors, warnings };
}
