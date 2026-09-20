/**
 * 从本票订单 + 本侧费用行组装自动费用模板草稿（不落库）。
 */

import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

import { getIndustryCategoryOptions } from '../../data';

export type OrderFeeTemplateDraftDisplay = {
  bookingAgentName?: string;
  carrierName?: string;
  clientName?: string;
  podName?: string;
  polName?: string;
};

export type OrderFeeTemplateDraft = {
  display: OrderFeeTemplateDraftDisplay;
  header: Omit<
    OrderFeeTemplateAdminApi.OrderFeeTemplateAddDto,
    'orderFeeTemplateItems'
  >;
  items: OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto[];
};

function pickId(value: unknown): null | number | string {
  if (value === null || value === undefined || value === '') return null;
  return value as number | string;
}

function toNumberId(value: unknown): null | number {
  const id = pickId(value);
  if (id === null) return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function toStringId(value: unknown): null | string {
  const id = pickId(value);
  if (id === null) return null;
  return String(id);
}

function resolveIndustryCategoryKey(row: any): null | number {
  const raw = row?.industryCategory_value ?? row?.industryCategory;
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

  const options = getIndustryCategoryOptions();
  const asString = String(raw);
  const byValue = options.find((opt) => opt.value === asString);
  if (byValue) return byValue.key;
  const byLabel = options.find((opt) => opt.label === asString);
  if (byLabel) return byLabel.key;
  const asNum = Number(asString);
  if (Number.isFinite(asNum)) {
    const byKey = options.find((opt) => opt.key === asNum);
    if (byKey) return byKey.key;
  }
  return null;
}

/**
 * 费用代码 id 保持字符串，禁止 Number(snowflake)——大 id 会丢精度，
 * 模板表按 id 反查名称时对不上，单元格就会直接显示成数字 id。
 */
function resolveFeeCodeId(row: any): null | string {
  const fromValue = row?.feeCodeId_value ?? row?.feeCode?.id;
  if (fromValue != null && fromValue !== '') {
    return toStringId(fromValue);
  }
  const raw = row?.feeCodeId;
  // 格内已是「编码-名称」Label，不能当 id
  if (typeof raw === 'string' && raw.trim() && Number.isNaN(Number(raw))) {
    return null;
  }
  return toStringId(raw);
}

/** 从费用行取已展示的费用名称，供模板表 lookup 失败时兜底 */
function resolveFeeCodeLabel(row: any): string | undefined {
  const display = row?.feeCodeId;
  if (
    typeof display === 'string' &&
    display.trim() &&
    Number.isNaN(Number(display))
  ) {
    return display;
  }
  const code = row?.feeCode?.code || row?.feeCode?.feeCode;
  const name = row?.feeCode?.cnName || row?.feeCode?.feeName;
  if (code || name) {
    return code && name ? `${code}-${name}` : String(code || name);
  }
  return undefined;
}

function resolveSettlementId(row: any): null | string {
  const raw =
    row?.settlementId_value ?? row?.settlementId ?? row?.settlement?.id;
  return toStringId(raw);
}

/** 币别 id 同样保持字符串，避免雪花 Number 丢精度 */
function resolveCurrencyId(row: any): null | string {
  const fromValue = row?.currencyId_value ?? row?.currency?.id;
  if (fromValue != null && fromValue !== '') {
    return toStringId(fromValue);
  }
  const raw = row?.currencyId;
  if (typeof raw === 'string' && raw.trim() && Number.isNaN(Number(raw))) {
    return null;
  }
  return toStringId(raw);
}

function resolveUnit(row: any): string {
  const raw = row?.unit_value ?? row?.unit;
  return raw == null ? '' : String(raw);
}

function truncateName(name: string, max = 64): string {
  const text = name.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max);
}

function buildDefaultName(
  order: any,
  paySide: number,
  display: OrderFeeTemplateDraftDisplay,
): string {
  const side = paySide === 1 ? '应付' : '应收';
  const parts = [
    display.clientName || order?.client?.name || order?.clientName,
    display.polName ||
      order?.pol?.portName ||
      order?.pol?.cnName ||
      order?.polName,
    display.podName ||
      order?.pod?.portName ||
      order?.pod?.cnName ||
      order?.podName,
    side,
  ].filter((part) => part != null && String(part).trim() !== '');
  return truncateName(
    parts.length > 0 ? parts.join('-') : `自动费用模板-${side}`,
  );
}

/**
 * 将费用行映射为模板明细；缺费用代码/币别/单位/含税单价的行跳过。
 */
export function mapOrderFeeRowToTemplateItem(
  row: any,
  sortId: number,
): null | OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto {
  const feeCodeId = resolveFeeCodeId(row);
  const currencyId = resolveCurrencyId(row);
  const unit = resolveUnit(row);
  const unitPrice = Number(row?.unitPrice);

  if (!feeCodeId || !currencyId || !unit || !Number.isFinite(unitPrice)) {
    return null;
  }

  const industryCategory = resolveIndustryCategoryKey(row);
  const settlementId = resolveSettlementId(row);
  const taxRateRaw = row?.taxRate;
  const taxRate =
    taxRateRaw === null || taxRateRaw === undefined || taxRateRaw === ''
      ? 0
      : Number(taxRateRaw);
  const noTaxUnitPrice = Number(row?.noTaxUnitPrice);
  const feeCodeLabel = resolveFeeCodeLabel(row);

  return {
    serviceType: toNumberId(row?.serviceType) ?? undefined,
    feeCodeId,
    // 仅前端展示兜底，syncDataToParent / AddAsync 前会丢掉
    ...(feeCodeLabel ? { feeCodeLabel } : {}),
    industryCategory: industryCategory as any,
    settlementId: (settlementId || '') as any,
    currencyId,
    unitPrice,
    noTaxUnitPrice: Number.isFinite(noTaxUnitPrice)
      ? noTaxUnitPrice
      : unitPrice,
    amount: row?.amount != null ? Number(row.amount) : undefined,
    unit,
    taxRate: Number.isFinite(taxRate) ? taxRate : 0,
    noTaxAmount: row?.noTaxAmount != null ? Number(row.noTaxAmount) : undefined,
    sortId,
    remark: row?.remark != null ? String(row.remark) : undefined,
  } as OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto & {
    feeCodeLabel?: string;
  };
}

/**
 * 从订单详情 + 本侧费用列表组装模板草稿。
 */
export function buildOrderFeeTemplateDraft(options: {
  bizType?: number;
  fees: any[];
  orderDetail: any;
  paySide: number;
}): OrderFeeTemplateDraft {
  const { orderDetail, fees, paySide } = options;
  const order = orderDetail || {};

  const display: OrderFeeTemplateDraftDisplay = {
    clientName: order.client?.name || order.clientName || undefined,
    bookingAgentName:
      order.bookingAgent?.name || order.bookingAgentName || undefined,
    carrierName:
      order.carrier?.cnName ||
      order.carrier?.cnShortName ||
      order.carrierName ||
      undefined,
    polName:
      order.pol?.portName || order.pol?.cnName || order.polName || undefined,
    podName:
      order.pod?.portName || order.pod?.cnName || order.podName || undefined,
  };

  const items: OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto[] = [];
  (fees || []).forEach((row, index) => {
    const item = mapOrderFeeRowToTemplateItem(row, index + 1);
    if (item) items.push(item);
  });

  const header: OrderFeeTemplateDraft['header'] = {
    name: buildDefaultName(order, paySide, display),
    bizType: 0, // 海运出口（当前模板仅支持）
    paySide: paySide === 1 ? 1 : 0,
    efficient: true,
    orgId: toNumberId(order.orgId) ?? undefined,
    clientId: toStringId(order.clientId ?? order.client?.id) ?? undefined,
    tradeTermsType: toNumberId(order.tradeTermsType) ?? undefined,
    cargoId: toNumberId(order.cargoId) ?? undefined,
    codeFrtId: toNumberId(order.codeFrtId) ?? undefined,
    codeSourceId: toNumberId(order.codeSourceId) ?? undefined,
    carrierId: toNumberId(order.carrierId ?? order.carrier?.id) ?? undefined,
    bookingAgentId:
      toStringId(order.bookingAgentId ?? order.bookingAgent?.id) ?? undefined,
    polId: toNumberId(order.polId ?? order.pol?.id) ?? undefined,
    podId: toNumberId(order.podId ?? order.pod?.id) ?? undefined,
    blType: toNumberId(order.blType) ?? undefined,
    serviceType: toNumberId(order.serviceType) ?? undefined,
    sortId: 0,
    remark: undefined,
  };

  return { header, items, display };
}
