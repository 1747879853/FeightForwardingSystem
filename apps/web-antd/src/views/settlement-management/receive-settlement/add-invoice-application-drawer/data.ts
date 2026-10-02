import type { VbenFormSchema } from '#/adapter/form';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { formatAmount } from '../form-data';

export interface AddInvoiceDrawerProps {
  /** 收费核销ID（追加时传入，排除本单已结过的发票开出 + 费用） */
  receiveSettlementId?: string;
  /** 结算对象ID（随银行流水带出） */
  settlementId?: string;
  /** 结算对象名称 */
  settlementName?: string;
  /** 币别ID（随银行流水带出） */
  currencyId?: number;
  /** 币别代码 */
  currencyCode?: string;
  /** 已存在的「发票开出 + 费用」键，格式 invoiceIssueId::orderFeeId */
  selectedItemIds?: string[];
}

/** 确认选择后返回给父组件的费用行 */
export interface SelectedInvoiceFee {
  invoiceIssueId: string;
  orderFeeId: string;
  applicationNo?: string;
  invoiceNo?: string;
  invoiceIssueTime?: string;
  appliedAmount?: number;
  exchangeRate?: null | number;
  feeCodeName?: string;
  currencyCode?: string;
  paySide?: number;
  amount?: number;
  invoicedAmount?: number;
  /** 用户录入的本次结算金额（费用原币） */
  settledAmount: number;
  /** 该费用历史累计已结算金额 */
  historySettledAmount?: number;
  invoiceSettleableAmount?: number;
  settlementName?: string;
  transportOrderId?: string;
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  remark?: string;
}

export type InvoiceGroup = ReceiveSettlementAdminApi.InvoiceIssueSettleGroupDto;
export type InvoiceItem = ReceiveSettlementAdminApi.InvoiceIssueSettleItemDto;

/** 选票行主键：发票开出 + 费用 */
export function invoiceIssueFeeKey(invoiceIssueId: string, orderFeeId: string) {
  return `${invoiceIssueId}::${orderFeeId}`;
}

/** 搜索区标签加宽，避免「开出单号」换行 */
const searchFieldCommon = {
  labelWidth: 96,
  labelClass: 'whitespace-nowrap',
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
      label: '开出单号',
      componentProps: {
        placeholder: '请输入开出单号',
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
      fieldName: 'invoiceIssueTimeRange',
      label: '开票时间',
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
    key: group.invoiceIssueId,
    id: group.invoiceIssueId,
    invoiceIssueId: group.invoiceIssueId,
    applicationNo: group.applicationNo,
    invoiceNo: group.invoiceNo,
    settlementName: group.settlement?.name,
    currencyCode: group.currency?.code,
    invoiceIssueTime: group.invoiceIssueTime,
    itemCount: group.items?.length ?? 0,
    totalSettleableAmount: (group.items ?? []).reduce(
      (sum, item) => sum + (item.invoiceSettleableAmount || 0),
      0,
    ),
    /** NestedDataTable 内层数据 */
    items: group.items ?? [],
  };
}

/** NestedDataTable 外层列（发票开出） */
export const invoiceGroupColumns = [
  {
    key: 'checkbox',
    title: '',
    width: 48,
    align: 'center' as const,
    className: 'invoice-select-col',
  },
  {
    dataIndex: 'applicationNo',
    key: 'applicationNo',
    title: '开出单号',
    width: 170,
  },
  {
    dataIndex: 'invoiceNo',
    key: 'invoiceNo',
    title: '发票号',
    width: 150,
  },
  {
    dataIndex: 'settlementName',
    key: 'settlementName',
    title: '结算对象',
    width: 150,
  },
  {
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    title: '币别',
    width: 80,
  },
  {
    dataIndex: 'invoiceIssueTime',
    key: 'invoiceIssueTime',
    title: '开票时间',
    width: 160,
  },
  {
    dataIndex: 'itemCount',
    key: 'itemCount',
    title: '明细数',
    width: 80,
    align: 'right' as const,
  },
  {
    dataIndex: 'totalSettleableAmount',
    key: 'totalSettleableAmount',
    title: '可结算余额合计',
    width: 140,
    align: 'right' as const,
  },
];

/** NestedDataTable 内层列（费用） */
export const invoiceItemColumns = [
  {
    key: 'checkbox',
    title: '',
    width: 48,
    align: 'center' as const,
  },
  {
    dataIndex: 'commissionNum',
    key: 'commissionNum',
    title: '委托编号',
    width: 140,
  },
  {
    dataIndex: 'mblNum',
    key: 'mblNum',
    title: '主提单号',
    width: 140,
  },
  {
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    title: '费用名称',
    width: 140,
  },
  {
    dataIndex: 'paySide',
    key: 'paySide',
    title: '收付',
    width: 80,
  },
  {
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    title: '币别',
    width: 80,
  },
  {
    dataIndex: 'amount',
    key: 'amount',
    title: '费用总额',
    width: 110,
    align: 'right' as const,
  },
  {
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    title: '开票金额',
    width: 110,
    align: 'right' as const,
  },
  {
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    title: '汇率',
    width: 110,
    align: 'right' as const,
  },
  {
    dataIndex: 'historySettledAmount',
    key: 'historySettledAmount',
    title: '累计已结算',
    width: 120,
    align: 'right' as const,
  },
  {
    dataIndex: 'invoiceSettleableAmount',
    key: 'invoiceSettleableAmount',
    title: '剩余可结算',
    width: 120,
    align: 'right' as const,
  },
  {
    dataIndex: 'inputSettledAmount',
    key: 'inputSettledAmount',
    title: '本次结算金额',
    width: 150,
  },
];

export { formatAmount };
