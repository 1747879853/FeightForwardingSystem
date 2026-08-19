import type { VbenFormSchema } from '#/adapter/form';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import dayjs from 'dayjs';

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
  /** 收付类别：0 应收，1 应付 */
  paySide?: number;
  currencyCode?: string;
  amount: number;
  remainingAmount: number;
  settlementName?: string;
  settledAmount: number;
  remark?: string;
}

/** 选费检索：收付类型。空字符串表示全部，不传给接口 */
export const RECEIVE_FEE_PAY_SIDE_FILTER_OPTIONS = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
  { label: '全部', value: '' },
];

/** 重置检索时恢复的默认值（收付类型默认应收） */
export const ADD_FEE_SEARCH_DEFAULTS = {
  keyword: '',
  clientId: undefined as string | undefined,
  etdRange: undefined as undefined,
  saleIds: [] as Array<number | string>,
  operatorIds: [] as Array<number | string>,
  paySide: 0 as number | '',
};

function toIsoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = dayjs(value as string);
  return date.isValid() ? date.toISOString() : undefined;
}

function toIdList(value: unknown): Array<number | string> | undefined {
  if (Array.isArray(value) && value.length > 0) return value;
  if (value !== undefined && value !== null && value !== '') {
    return [value as number | string];
  }
  return undefined;
}

/** 从表单值组装 GetOrderFeeGroupAsync 检索参数 */
export function buildFeeGroupSearchQuery(values: Record<string, any>) {
  const [etdStart, etdEnd] = Array.isArray(values.etdRange)
    ? values.etdRange
    : [];
  const paySide = values.paySide;

  return {
    keyword: values.keyword || undefined,
    clientId: values.clientId || undefined,
    etdStart: toIsoDate(etdStart),
    etdEnd: toIsoDate(etdEnd),
    saleIds: toIdList(values.saleIds),
    operatorIds: toIdList(values.operatorIds),
    paySide: paySide === 0 || paySide === 1 ? paySide : undefined,
  };
}

export type OrderGroup = ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto;

const searchFieldCommon = {
  labelWidth: 72,
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
      fieldName: 'keyword',
      label: '编号',
      componentProps: {
        placeholder: '委托编号 / 主提单号',
        allowClear: true,
      },
    },
    {
      ...searchFieldCommon,
      component: 'ClientSelect',
      fieldName: 'clientId',
      label: '委托单位',
      componentProps: {
        industryCategory: '',
        placeholder: '请选择委托单位',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      ...searchFieldCommon,
      component: 'RangePicker',
      fieldName: 'etdRange',
      label: '开船日期',
      componentProps: {
        placeholder: ['开始日期', '结束日期'],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      ...searchFieldCommon,
      component: 'UserSelect',
      fieldName: 'saleIds',
      label: '销售',
      componentProps: {
        placeholder: '请选择销售',
        allowClear: true,
        mode: 'multiple',
        maxTagCount: 1,
        class: 'w-full',
      },
    },
    {
      ...searchFieldCommon,
      component: 'UserSelect',
      fieldName: 'operatorIds',
      label: '操作',
      componentProps: {
        placeholder: '请选择操作',
        allowClear: true,
        mode: 'multiple',
        maxTagCount: 1,
        class: 'w-full',
      },
    },
    {
      ...searchFieldCommon,
      component: 'Select',
      fieldName: 'paySide',
      label: '收付类型',
      defaultValue: 0,
      componentProps: {
        placeholder: '请选择收付类型',
        allowClear: false,
        options: RECEIVE_FEE_PAY_SIDE_FILTER_OPTIONS,
        class: 'w-full',
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
    dataIndex: 'paySide',
    key: 'paySide',
    title: '收付类别',
    width: 90,
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
