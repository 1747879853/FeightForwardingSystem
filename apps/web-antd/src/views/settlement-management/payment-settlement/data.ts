import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import dayjs from 'dayjs';

import {
  formatPayAppCommissionNums,
  formatPayAppMblNums,
} from '#/views/fee-management/payment-application/format-pay-app-mbl-nums';

/** 结算状态枚举 */
export enum SettlementStatus {
  /** 录入中 */
  Entering = 0,
  /** 审核中 */
  Auditing = 1,
  /** 已驳回 */
  Rejected = 2,
  /** 审核通过 */
  Passed = 3,
  /** 部分结算 */
  Partial = 4,
  /** 已结算 */
  Settlemented = 5,
}

/** 获取结算状态选项 */
const getSettlementStatusOptions = () => [
  {
    value: SettlementStatus.Entering,
    label: '录入中',
    color: 'default',
  },
  {
    value: SettlementStatus.Auditing,
    label: '审核中',
    color: 'processing',
  },
  {
    value: SettlementStatus.Rejected,
    label: '已驳回',
    color: 'error',
  },
  {
    value: SettlementStatus.Passed,
    label: '审核通过',
    color: 'success',
  },
  {
    value: SettlementStatus.Partial,
    label: '部分结算',
    color: 'warning',
  },
  {
    value: SettlementStatus.Settlemented,
    label: '已结算',
    color: 'success',
  },
];

/** 格式化日期时间到分钟 */
const formatDateTime = (value: string | undefined) => {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

/** 格式化金额 */
const formatAmount = (value: number | undefined) => {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
};

/** 表格列配置 */
export function useColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 60,
      fixed: 'left',
    },
    {
      field: 'settlementNo',
      title: '结算单号',
      minWidth: 180,
      fixed: 'left',
    },
    {
      field: 'mblNums',
      title: '主提单号',
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      formatter: ({
        row,
      }: {
        row: PaymentSettlementAdminApi.PaymentSettlementListDto;
      }) => formatPayAppMblNums(row.payAppFeeBySeaExportGroup),
    },
    {
      field: 'commissionNums',
      title: '委托编号',
      minWidth: 160,
      showOverflow: true,
      sortable: false,
      formatter: ({
        row,
      }: {
        row: PaymentSettlementAdminApi.PaymentSettlementListDto;
      }) => formatPayAppCommissionNums(row.payAppFeeBySeaExportGroup),
    },
    // {
    //   field: 'status',
    //   title: '结算状态',
    //   width: 100,
    //   slots: { default: 'status' },
    // },
    {
      field: 'settlementTime',
      title: '结算时间',
      width: 160,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'payType',
      title: '付款方式',
      width: 100,
      slots: { default: 'payType' },
    },
    {
      field: 'locked',
      title: '锁定状态',
      width: 100,
      slots: { default: 'locked' },
    },
    {
      field: 'settlementName',
      title: '结算对象',
      minWidth: 150,
      formatter: ({ row }) => row.settlement?.name || '-',
    },
    {
      field: 'currencyCode',
      title: '结算币别',
      width: 100,
      formatter: ({ row }) => row.currency?.code || '-',
    },
    {
      field: 'totalSettledPrice',
      title: '结算金额合计',
      width: 140,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'transactionFee',
      title: '手续费',
      width: 100,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      width: 100,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      width: 160,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 200,
      showOverflow: true,
    },
  ];
}

/** 查询表单配置 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '编号',
      componentProps: {
        placeholder: '请输入主提单号或委托编号',
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'settlementNo',
      label: '结算单号',
      componentProps: {
        placeholder: '请输入结算单号',
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'settlementId',
      label: '结算对象',
      componentProps: {
        placeholder: '请选择结算对象',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: '结算币别',
      componentProps: {
        placeholder: '请选择币别',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'OrgBankAccountSelect',
      fieldName: 'orgBankAccountId',
      label: '我司银行',
      componentProps: {
        placeholder: '请选择我司银行',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'settlementTimeRange',
      label: '结算时间',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        showTime: true,
        format: 'YYYY-MM-DD HH:mm',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'creatorUserId',
      label: '创建人',
      componentProps: {
        placeholder: '请选择创建人',
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}
