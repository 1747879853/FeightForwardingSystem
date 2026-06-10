import dayjs from 'dayjs';

/** 格式化金额，保留两位小数 */
export function formatAmount(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
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

export interface ReceiveSettlementSelectedFee {
  id?: string;
  orderFeeId: string;
  transportOrderId?: string;
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  feeCodeName?: string;
  currencyCode?: string;
  amount: number;
  remainingAmount: number;
  settlementName?: string;
  settledAmount: number;
  remark?: string;
}
