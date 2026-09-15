import { FrightModule } from '#/api/system/permission';
import {
  hasMaskRule,
  isAlwaysMasked,
  isMaskedFieldsLoaded,
} from '#/composables/use-masked-fields';

/**
 * 业务费用表（Handsontable）字段级权限（PropMask / OrderFee）
 *
 * - 条件屏蔽（alwaysMasked=false）：单元格显示 `***`，只读
 * - 非条件屏蔽（alwaysMasked=true）：整列隐藏
 *
 * 后端序列化时剔除被屏蔽字段的 key（不是 null）。判定用 `'prop' in obj`。
 * 行上挂 `_maskedFields`，避免后续 normalize 补 key 后丢失「原先没有这个字段」的信息。
 *
 * @see doc/权限/用户或角色字段级别权限逻辑.md
 */

export const MASKED_TEXT = '***';

export const ORDER_FEE_MASKED_FIELDS_KEY = '_maskedFields';

const OF = FrightModule.OrderFee;

type FieldSource = {
  propName: string;
  jsonKeys: string[];
};

function of(propName: string, ...jsonKeys: string[]): FieldSource {
  return { propName, jsonKeys };
}

function ofFk(
  idProp: string,
  idKey: string,
  objProp: string,
  objKey: string,
): FieldSource[] {
  return [of(idProp, idKey), of(objProp, objKey)];
}

function asSources(source: FieldSource | FieldSource[]): FieldSource[] {
  return Array.isArray(source) ? source : [source];
}

/**
 * Handsontable 列 field → OrderFee PropMask 数据源。
 * 未声明的列（勾选、序号）不参与屏蔽。
 */
const COLUMN_SOURCES: Record<string, FieldSource | FieldSource[]> = {
  invoiceStatus: of('InvoiceStatus', 'invoiceStatus'),
  combinedFeeStatus: [
    of('FeeStatus', 'feeStatus'),
    of('CombinedFeeStatus', 'combinedFeeStatus'),
  ],
  feeCodeId: ofFk('FeeCodeId', 'feeCodeId', 'FeeCode', 'feeCode'),
  industryCategory: of('IndustryCategory', 'industryCategory'),
  settlementId: ofFk(
    'SettlementId',
    'settlementId',
    'Settlement',
    'settlement',
  ),
  currencyId: ofFk('CurrencyId', 'currencyId', 'Currency', 'currency'),
  exchangeRate: of('ExchangeRate', 'exchangeRate'),
  unitPrice: of('UnitPrice', 'unitPrice'),
  amount: of('Amount', 'amount'),
  unit: of('Unit', 'unit'),
  quantity: of('Quantity', 'quantity'),
  taxRate: of('TaxRate', 'taxRate'),
  noTaxUnitPrice: of('NoTaxUnitPrice', 'noTaxUnitPrice'),
  noTaxAmount: of('NoTaxAmount', 'noTaxAmount'),
  rqstPaymentAmount: of('RqstPaymentAmount', 'rqstPaymentAmount'),
  invoicedAmount: of('InvoicedAmount', 'invoicedAmount'),
  orderInvoiceAmount: of('OrderInvoiceAmount', 'orderInvoiceAmount'),
  settledAmount: of('SettledAmount', 'settledAmount'),
  invoiceBlocked: of('InvoiceBlocked', 'invoiceBlocked'),
  isConfidential: of('IsConfidential', 'isConfidential'),
  remark: of('Remark', 'remark'),
  dataEntryMethod: of('DataEntryMethod', 'dataEntryMethod'),
  creatorUserName: of('CreatorUserName', 'creatorUserName'),
  creationTime: of('CreationTime', 'creationTime'),
};

function sourcesOf(field: string): FieldSource[] {
  const source = COLUMN_SOURCES[field];
  return source ? asSources(source) : [];
}

function isSourceAlwaysMasked(source: FieldSource): boolean {
  return isAlwaysMasked(OF, source.propName);
}

function isSourceConditionallyRuled(source: FieldSource): boolean {
  return (
    hasMaskRule(OF, source.propName) && !isAlwaysMasked(OF, source.propName)
  );
}

function isSourceMissingOnDto(dto: unknown, source: FieldSource): boolean {
  if (!hasMaskRule(OF, source.propName)) return false;
  if (dto == null || typeof dto !== 'object') return true;
  const record = dto as Record<string, unknown>;
  return source.jsonKeys.some((key) => !(key in record));
}

/** 该列是否存在无条件屏蔽（应整列隐藏） */
export function isOrderFeeColumnAlwaysMasked(field: string): boolean {
  if (!isMaskedFieldsLoaded() || !field) return false;
  return sourcesOf(field).some((source) => isSourceAlwaysMasked(source));
}

export function getAlwaysMaskedOrderFeeColumnFields(): string[] {
  if (!isMaskedFieldsLoaded()) return [];
  return Object.keys(COLUMN_SOURCES).filter((field) =>
    isOrderFeeColumnAlwaysMasked(field),
  );
}

function getAttachedMaskedFields(row: unknown): string[] | undefined {
  if (row == null || typeof row !== 'object') return undefined;
  const attached = (row as Record<string, unknown>)[
    ORDER_FEE_MASKED_FIELDS_KEY
  ];
  return Array.isArray(attached) ? attached.map(String) : undefined;
}

/** 该行该列是否应显示 `***`（仅条件屏蔽；无条件列已被隐藏） */
export function isOrderFeeCellMasked(row: unknown, field: string): boolean {
  if (!isMaskedFieldsLoaded() || !field || !row) return false;
  const sources = sourcesOf(field);
  if (sources.length === 0) return false;
  if (sources.some((source) => isSourceAlwaysMasked(source))) {
    return false;
  }
  const attached = getAttachedMaskedFields(row);
  if (attached?.includes(field)) return true;
  const conditional = sources.some((source) =>
    isSourceConditionallyRuled(source),
  );
  if (!conditional) return false;
  return sources.some((source) => isSourceMissingOnDto(row, source));
}

/** 根据原始 DTO key 计算该行被条件屏蔽的列 field */
export function resolveMaskedOrderFeeFields(dto: unknown): string[] {
  if (!isMaskedFieldsLoaded() || dto == null) return [];
  return Object.keys(COLUMN_SOURCES).filter((field) => {
    const sources = sourcesOf(field);
    if (sources.some((source) => isSourceAlwaysMasked(source))) {
      return false;
    }
    const conditional = sources.some((source) =>
      isSourceConditionallyRuled(source),
    );
    if (!conditional) return false;
    return sources.some((source) => isSourceMissingOnDto(dto, source));
  });
}

/** 在费用行上挂条件屏蔽列清单，供渲染器在 normalize 补 key 后仍能判定 */
export function attachOrderFeeMaskMeta<T extends Record<string, any>>(
  row: T,
): T {
  if (!row) return row;
  const masked = resolveMaskedOrderFeeFields(row);
  if (masked.length > 0) {
    row[ORDER_FEE_MASKED_FIELDS_KEY] = masked;
  }
  return row;
}

export function omitMaskedOrderFeeValues<T extends Record<string, any>>(
  values: T,
  maskedFields?: Iterable<string>,
): T {
  const next = { ...values };
  const fields = new Set<string>([
    ...(maskedFields ?? []),
    ...(((values as Record<string, unknown>)[
      ORDER_FEE_MASKED_FIELDS_KEY
    ] as string[]) ?? []),
    ...getAlwaysMaskedOrderFeeColumnFields(),
  ]);
  for (const field of fields) {
    delete next[field];
    delete next[`${field}_value`];
  }
  delete next[ORDER_FEE_MASKED_FIELDS_KEY];
  return next;
}
