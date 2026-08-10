import type { VbenFormSchema } from '#/adapter/form';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { formatAmount } from '../form-data';

export interface AddFeeDrawerProps {
  receiveSettlementId?: string;
  settlementId?: string;
  settlementName?: string;
  currencyId?: number;
  currencyCode?: string;
  selectedFeeIds?: string[];
}

export interface SelectedReceiveFee {
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

export type OrderGroup = ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto;

const searchFieldCommon = {
  labelWidth: 64,
} as const;

export function useAddFeeSearchSchema(): VbenFormSchema[] {
  return [
    {
      ...searchFieldCommon,
      component: 'Input',
      fieldName: 'settlementName',
      label: '结算对象',
      componentProps: {
        disabled: true,
        placeholder: '随银行流水自动带出',
        class: 'w-full',
      },
    },
    {
      ...searchFieldCommon,
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: '币别',
      componentProps: {
        disabled: true,
        placeholder: '随银行流水自动带出',
        class: 'w-full',
      },
    },
    {
      ...searchFieldCommon,
      component: 'Input',
      fieldName: 'commissionNum',
      label: '委托编号',
      componentProps: {
        placeholder: '请输入委托编号',
        allowClear: true,
      },
    },
    {
      ...searchFieldCommon,
      component: 'Input',
      fieldName: 'mblNum',
      label: '主提单号',
      componentProps: {
        placeholder: '请输入主提单号',
        allowClear: true,
      },
    },
  ];
}

export function buildOrderRow(group: OrderGroup) {
  const order = group.transportOrder;
  return {
    key: order.id,
    id: order.id,
    commissionNum: order.commissionNum,
    mblNum: order.mblNum,
    bookingNum: order.bookingNum,
    clientName: order.client?.name,
    feeCount: group.orderFees?.length ?? 0,
    totalRemainingAmount: (group.orderFees ?? []).reduce(
      (sum, fee) => sum + (fee.remainingAmount || 0),
      0,
    ),
    /** NestedDataTable 内层数据 */
    orderFees: group.orderFees ?? [],
  };
}

/** NestedDataTable 外层列（业务） */
export const orderColumns = [
  {
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    title: '委托编号',
    width: 160,
  },
  {
    dataIndex: 'mblNum',
    key: 'mblNum',
    title: '主提单号',
    width: 160,
  },
  {
    dataIndex: 'bookingNum',
    key: 'bookingNum',
    title: '订舱号',
    width: 150,
  },
  {
    dataIndex: 'clientName',
    key: 'clientName',
    title: '客户',
    width: 160,
  },
  {
    dataIndex: 'feeCount',
    key: 'feeCount',
    title: '费用数',
    width: 90,
    align: 'right' as const,
  },
  {
    dataIndex: 'totalRemainingAmount',
    key: 'totalRemainingAmount',
    title: '剩余额度合计',
    width: 140,
    align: 'right' as const,
    /** Ant Table 用；NestedDataTable 走 outerBodyCell */
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
];

/** NestedDataTable 内层列（费用明细） */
export const feeItemColumns = [
  {
    key: 'checkbox',
    title: '',
    width: 48,
    align: 'center' as const,
  },
  {
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    title: '费用名称',
    width: 160,
  },
  {
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    title: '币别',
    width: 90,
  },
  {
    dataIndex: 'amount',
    key: 'amount',
    title: '费用总额',
    width: 120,
    align: 'right' as const,
  },
  {
    dataIndex: 'remainingAmount',
    key: 'remainingAmount',
    title: '剩余额度',
    width: 120,
    align: 'right' as const,
  },
  {
    dataIndex: 'settlementName',
    key: 'settlementName',
    title: '结算对象',
    width: 140,
  },
  {
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    title: '本次结算金额',
    width: 160,
  },
];

export { formatAmount };
