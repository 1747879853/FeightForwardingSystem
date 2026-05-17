import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import dayjs from 'dayjs';

/** 格式化金额 */
export function formatAmount(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0.00';
  return value.toFixed(2);
}

/** 格式化日期时间到分钟 */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

/** 付款方式选项 */
export const payTypeOptions = [
  { label: '现金', value: 1 },
  { label: '支票', value: 2 },
  { label: '电汇', value: 3 },
  { label: '其他', value: 4 },
];

/** 结算明细表格列配置 */
export function useSettlementItemColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      width: 60,
      title: '序号',
      fixed: 'left',
    },
    {
      field: 'applicationNo',
      title: '付费申请单号',
      minWidth: 150,
      fixed: 'left',
    },
    {
      field: 'feeCodeName',
      title: '费用名称',
      minWidth: 120,
    },
    {
      field: 'originalCurrencyCode',
      title: '原币币别',
      width: 100,
    },
    {
      field: 'settledAmount',
      title: '本次结算金额(原币)',
      width: 140,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'rate',
      title: '汇率',
      width: 100,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'settledPrice',
      title: '结算金额(结算币)',
      width: 140,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'remainingAppliedAmount',
      title: '剩余申请量',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'remainingFeeAmount',
      title: '费用剩余量',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 150,
      showOverflow: true,
    },
  ];
}

/** 汇率表格列配置 */
export function useRateColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      width: 60,
      title: '序号',
    },
    {
      field: 'originalCurrencyCode',
      title: '原币币别',
      width: 120,
    },
    {
      field: 'rate',
      title: '汇率',
      width: 150,
      align: 'right',
      editRender: { name: 'input' },
    },
  ];
}

/** 付费申请分组行数据 */
export interface PaymentApplicationGroupRow {
  /** 付费申请ID */
  paymentApplicationId: string;
  /** 付费申请单号 */
  applicationNo: string;
  /** 币别结算项列表 */
  currencyItems: PaymentSettlementAdminApi.PaymentSettlementAddItemCurrencyDto[];
  /** 展开状态 */
  expanded?: boolean;
}

/** 结算明细行数据（用于展示） */
export interface SettlementItemDisplayRow {
  /** 结算明细ID（编辑时使用） */
  id?: string;
  /** 付费申请ID */
  paymentApplicationId: string;
  /** 付费申请单号 */
  applicationNo: string;
  /** 付费申请明细ID */
  paymentApplicationItemId: string;
  /** 费用ID */
  orderFeeId: string;
  /** 原币币别ID */
  originalCurrencyId: number;
  /** 原币币别代码 */
  originalCurrencyCode: string;
  /** 本次结算原币金额 */
  settledAmount: number;
  /** 汇率快照 */
  rate: number;
  /** 结算币别金额 */
  settledPrice: number;
  /** 备注 */
  remark?: string;
  /** 该付费申请明细剩余申请量 */
  remainingAppliedAmount: number;
  /** 费用剩余结算量 */
  remainingFeeAmount: number;
  /** 费用详情 */
  orderFee?: PaymentApplicationAdminApi.OrderFeeForSettlementDto;
}
