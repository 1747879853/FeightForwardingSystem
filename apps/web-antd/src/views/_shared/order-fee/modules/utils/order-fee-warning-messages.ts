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
