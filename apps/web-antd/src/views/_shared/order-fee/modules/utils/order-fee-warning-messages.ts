import { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

const { OrderFeeWarningType: T } = OrderFeeAdminApi;

/** 预警类型 → 展示文案（接口只返回 type，文案按 §7.3 含义本地映射） */
const ORDER_FEE_WARNING_MESSAGE_MAP: Record<number, string> = {
  [T.ReceivableRateInconsistent]: '同一费用名称的应收费用存在不同汇率',
  [T.PayableRateInconsistent]: '同一费用名称的应付费用存在不同汇率',
  [T.ReceivableTaxInconsistent]: '同一费用名称的应收费用存在不同税率',
  [T.PayableTaxInconsistent]: '同一费用名称的应付费用存在不同税率',
  [T.TotalProfitNegative]: '合计利润为负',
  [T.CurrencyProfitNegative]: '单一币别利润为负',
  [T.FeeCodeProfitNegative]: '同一费用名称利润为负',
  [T.PayableFeeCodeMissingInReceivable]: '应付费用名称在应收中未出现',
  [T.ReceivableNegativeAmount]: '应收存在负数金额',
  [T.PayableNegativeAmount]: '应付存在负数金额',
  [T.ReceivableExchangeRateMismatch]: '应收汇率不是本月汇率',
  [T.PayableExchangeRateMismatch]: '应付汇率不是本月汇率',
  [T.ReceivableFeeCodeDuplicated]: '同一费用名称在应收中出现多条',
  [T.PayableFeeCodeDuplicated]: '同一费用名称在应付中出现多条',
  [T.ReceivableSettlementMismatch]: '应收结算对象与业务委托单位不一致',
  [T.OceanFreightNotUsd]: '海运费币别不是 USD',
  [T.InvoiceBlocked]: '存在禁开票费用',
  [T.TooManyCurrencies]: '本行费用币别种类达到 3 个及以上',
};

/** 将预警 type 转为展示文案；未知类型回退为「费用预警(type)」 */
export function getOrderFeeWarningMessage(type: number): string {
  return ORDER_FEE_WARNING_MESSAGE_MAP[type] ?? `费用预警(${type})`;
}

/** 可悬停高亮的明细（费用名 / 币别） */
export interface OrderFeeWarningDetailChip {
  key: string;
  label: string;
  orderFeeIds: string[];
}

/** 预警条展示模型（一组 type → 一条轮播） */
export interface OrderFeeWarningDisplayItem {
  key: string;
  type: number;
  paySide?: null | number;
  /** 类型文案 */
  message: string;
  /** 按费用名/币别拆开的可悬停明细 */
  details: OrderFeeWarningDetailChip[];
  /** 本组全部费用 id（合并型或整组兜底高亮） */
  orderFeeIds: string[];
}

function normalizeIds(ids?: null | string[]): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => String(id)).filter(Boolean);
}

function resolveDetailLabel(
  item: OrderFeeAdminApi.OrderFeeWarningItemDto,
): string {
  const fee = item.feeCode;
  if (fee) {
    return String(fee.cnName || fee.code || fee.enName || '').trim();
  }
  const currency = item.currency;
  if (currency) {
    return String(
      currency.code || currency.cnName || currency.enName || '',
    ).trim();
  }
  return '';
}

/** 将接口分组转为 UI 展示项 */
export function buildOrderFeeWarningDisplayItems(
  groups: OrderFeeAdminApi.OrderFeeWarningGroupDto[] | null | undefined,
): OrderFeeWarningDisplayItem[] {
  if (!Array.isArray(groups) || groups.length === 0) return [];

  return groups.map((group) => {
    const items = Array.isArray(group.items) ? group.items : [];
    const details: OrderFeeWarningDetailChip[] = [];
    const allIds: string[] = [];

    items.forEach((item, index) => {
      const orderFeeIds = normalizeIds(item.orderFeeIds);
      allIds.push(...orderFeeIds);
      const label = resolveDetailLabel(item);
      if (!label) return;
      details.push({
        key: `${group.type}-${index}-${label}`,
        label,
        orderFeeIds,
      });
    });

    return {
      key: String(group.type),
      type: group.type,
      paySide: group.paySide,
      message: getOrderFeeWarningMessage(group.type),
      details,
      orderFeeIds: [...new Set(allIds)],
    };
  });
}

/** 纯文案（无交互场景兜底，如需要字符串列表时） */
export function getOrderFeeWarningPlainText(
  item: OrderFeeWarningDisplayItem,
): string {
  if (item.details.length === 0) return item.message;
  return `${item.message}：${item.details.map((d) => d.label).join('、')}`;
}
