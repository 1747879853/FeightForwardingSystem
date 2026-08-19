import dayjs from 'dayjs';

/** 格式化金额，保留两位小数 */
export function formatAmount(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
}

/** 格式化金额并附带币别 */
export function formatAmountWithCurrency(
  value: number | undefined | null,
  currencyCode?: string,
): string {
  const amount = formatAmount(value);
  if (amount === '-') return amount;
  return currencyCode ? `${amount} ${currencyCode}` : amount;
}

/** 格式化日期时间到分钟 */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

/** 收费结算状态文字 */
export function getReceiveSettlementStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: '录入中',
    1: '审核中',
    2: '已驳回',
    3: '审核通过',
    4: '部分结算',
    5: '已结算',
  };
  return map[status] ?? '未知';
}

/** 收费结算状态 Tag 颜色 */
export function getReceiveSettlementStatusColor(status: number): string {
  const map: Record<number, string> = {
    0: 'default',
    1: 'processing',
    2: 'error',
    3: 'success',
    4: 'warning',
    5: 'success',
  };
  return map[status] ?? 'default';
}

/** 结算类型文字：0 按费用(按业务)，1 按开票申请 */
export function getReceiveSettlementTypeLabel(type: number): string {
  const map: Record<number, string> = {
    0: '按业务',
    1: '按开票申请',
  };
  return map[type] ?? '按业务';
}

/** 结算类型 Tag 颜色 */
export function getReceiveSettlementTypeColor(type: number): string {
  return type === 1 ? 'purple' : 'blue';
}

/** 收付方向文字：0 应收，1 应付 */
export function getPaySideLabel(paySide: number | undefined | null): string {
  if (paySide === 1) return '应付';
  if (paySide === 0) return '应收';
  return '-';
}

/** 收付方向 Tag 颜色 */
export function getPaySideColor(paySide: number | undefined | null): string {
  return paySide === 1 ? 'orange' : 'green';
}

/** 结算金额净额符号：应收为正，应付为负 */
export function toNetAmount(
  paySide: number | undefined | null,
  amount: number | undefined | null,
): number {
  const value = amount ?? 0;
  return paySide === 1 ? -value : value;
}

export interface ReceiveSettlementSelectedFee {
  id?: string;
  orderFeeId: string;
  transportOrderId?: string;
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  feeCodeName?: string;
  /** 收付类别：0 应收，1 应付 */
  paySide?: number;
  currencyCode?: string;
  amount: number;
  remainingAmount: number;
  settlementName?: string;
  settledAmount: number;
  remark?: string;
}
