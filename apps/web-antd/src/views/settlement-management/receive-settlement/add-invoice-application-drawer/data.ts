import type { VbenFormSchema } from '#/adapter/form';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { formatAmount, formatDateTime } from '../form-data';

export interface AddInvoiceDrawerProps {
  /** 收费核销ID（追加时传入，排除已关联的开票明细） */
  receiveSettlementId?: string;
  /** 结算对象ID（随银行流水带出） */
  settlementId?: string;
  /** 结算对象名称 */
  settlementName?: string;
  /** 币别ID（随银行流水带出） */
  currencyId?: number;
  /** 币别代码 */
  currencyCode?: string;
  /** 已存在的开票明细ID列表（用于禁用勾选） */
  selectedItemIds?: string[];
}

/** 确认选择后返回给父组件的开票明细 */
export interface SelectedInvoiceFee {
  invoiceApplicationId: string;
  invoiceApplicationItemId: string;
  orderFeeId: string;
  applicationNo?: string;
  invoiceNo?: string;
  appliedAmount?: number;
  feeCodeName?: string;
  currencyCode?: string;
  paySide?: number;
  amount?: number;
  invoicedAmount?: number;
  settledAmount: number;
  invoiceSettleableAmount?: number;
  settlementName?: string;
  transportOrderId?: string;
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  remark?: string;
}

export type InvoiceGroup = ReceiveSettlementAdminApi.InvoiceAppSettleGroupDto;

const searchFieldCommon = {
  labelWidth: 72,
} as const;

export function useAddInvoiceSearchSchema(): VbenFormSchema[] {
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
      fieldName: 'applicationNo',
      label: '开票申请单号',
      componentProps: {
        placeholder: '请输入开票申请单号',
        allowClear: true,
      },
    },
    {
      ...searchFieldCommon,
      component: 'Input',
      fieldName: 'invoiceNo',
      label: '发票号',
      componentProps: {
        placeholder: '请输入发票号',
        allowClear: true,
      },
    },
    {
      ...searchFieldCommon,
      component: 'RangePicker',
      fieldName: 'applyTimeRange',
      label: '申请时间',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

export function buildInvoiceGroupRow(group: InvoiceGroup) {
  return {
    key: group.invoiceApplicationId,
    id: group.invoiceApplicationId,
    applicationNo: group.applicationNo,
    invoiceNo: group.invoiceNo,
    settlementName: group.settlementName,
    currencyCode: group.currencyCode,
    applyTime: group.applyTime,
    itemCount: group.items?.length ?? 0,
    totalSettleableAmount: (group.items ?? []).reduce(
      (sum, item) => sum + (item.invoiceSettleableAmount || 0),
      0,
    ),
  };
}

export const invoiceGroupColumns = [
  {
    dataIndex: 'applicationNo',
    title: '开票申请单号',
    width: 170,
  },
  {
    dataIndex: 'invoiceNo',
    title: '发票号',
    width: 150,
  },
  {
    dataIndex: 'settlementName',
    title: '结算对象',
    minWidth: 150,
  },
  {
    dataIndex: 'currencyCode',
    title: '币别',
    width: 80,
  },
  {
    dataIndex: 'applyTime',
    title: '申请时间',
    width: 160,
    customRender: ({ text }: { text: string }) => formatDateTime(text),
  },
  {
    dataIndex: 'itemCount',
    title: '明细数',
    width: 80,
    align: 'right' as const,
  },
  {
    dataIndex: 'totalSettleableAmount',
    title: '可结算余额合计',
    width: 140,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
];
