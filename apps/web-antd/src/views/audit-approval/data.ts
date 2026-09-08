import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

import dayjs from 'dayjs';

import { $t } from '#/locales';
import { BusinessTypeOptions } from '#/views/client/payment-terms/data';
import { getFeeStatusOptions } from '#/views/sea-export-admin/orderFee/data';

/** 费用审核状态（列表筛选项） */
const getFeeAuditStatusOptions = () => [
  { value: null, label: '全部' },
  { value: false, label: $t('auditApproval.status.Submitted') },
];

/** 格式化会计期间为年月 (YYYY-MM) */
const formatAccountDate = ({ cellValue }: { cellValue: unknown }) => {
  if (!cellValue) return '--';
  const date = dayjs(cellValue as string);
  return date.isValid() ? date.format('YYYY-MM') : '--';
};

export const getTaskStatusOptions = () => [
  {
    value: 0,
    label: $t('auditApproval.task.statusOptions.Auditing'),
    color: '#ff9900',
  },
  {
    value: 1,
    label: $t('auditApproval.task.statusOptions.Rejected'),
    color: '#f56c6c',
  },
  {
    value: 2,
    label: $t('auditApproval.task.statusOptions.Passed'),
    color: '#67c23a',
  },
  {
    value: 3,
    label: $t('auditApproval.task.statusOptions.PartialPassed'),
    color: '#909399',
  },
];

/** 列表搜索表单 schema */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'Processed',
      label: '费用审核状态',
      defaultValue: false,
      componentProps: {
        allowClear: true,
        options: getFeeAuditStatusOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'BizType',
      label: $t('seaExport.client.paymentTerms.BizType'),
      componentProps: {
        allowClear: true,
        options: BusinessTypeOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'TrimInput',
      fieldName: 'Keyword',
      label: $t('seaExport.export.keyword'),
      componentProps: {
        placeholder: $t('seaExport.export.keywordPlaceholder'),
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'ClientId',
      label: $t('seaExport.export.clientId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'ETDStart',
      label: $t('seaExport.export.etd'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'ETDEnd',
      label: $t('seaExport.export.deadline'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'SaleId',
      label: $t('system.user.userAttributeOptions.sales'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
        userAttribute: 16,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'OperatorId',
      label: $t('system.user.userAttributeOptions.operation'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
        userAttribute: 1,
      },
    },
  ];
}

/** 费用审核任务列表列 */
export function useExpenseAllColumns(): VxeTableGridOptions<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>['columns'] {
  return [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      field: 'transportOrder.bizType',
      title: $t('seaExport.client.paymentTerms.BizType'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: BusinessTypeOptions,
      },
    },
    {
      field: 'transportOrder.commissionNum',
      title: $t('seaExport.export.commissionNum'),
      minWidth: 100,
    },
    {
      field: 'feeStatusReceive',
      title: $t('seaExport.export.orderFee.receivableCharges'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getFeeStatusOptions(),
      },
    },
    {
      field: 'feeStatusPay',
      title: $t('seaExport.export.orderFee.payableCharges'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getFeeStatusOptions(),
      },
    },
    {
      field: 'transportOrder.mblNum',
      title: $t('seaExport.export.mblNum'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.client.name',
      title: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.etd',
      title: $t('seaExport.export.etd'),
      minWidth: 100,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.accountDate',
      title: $t('seaExport.export.accountDate'),
      minWidth: 100,
      formatter: formatAccountDate,
    },
    {
      field: 'changeOrder.reason',
      title: '更改原因',
      minWidth: 150,
      formatter: ({ row }: { row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto }) => {
        if (!row.changeOrderId && !row.changeOrder) return '--';
        return row.changeOrder?.reason || '--';
      },
    },
    {
      field: 'transportOrder.saleNames',
      title: $t('system.user.userAttributeOptions.sales'),
      minWidth: 90,
    },
    {
      field: 'transportOrder.operatorNames',
      title: $t('system.user.userAttributeOptions.operation'),
      minWidth: 90,
    },
    {
      field: 'transportOrder.POLPortName',
      title: $t('seaExport.export.polId'),
      minWidth: 100,
      formatter: ({ row }: { row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto }) => {
        const to = row.transportOrder;
        if (to?.bizType === 0) return to.seaExport?.pol?.portName || '--';
        if (to?.bizType === 1) return to.seaImport?.pol?.portName || '--';
        if (to?.bizType === 2) return to.airExport?.pol?.cnName || '--';
        return '--';
      },
    },
    {
      field: 'transportOrder.PODPortName',
      title: $t('seaExport.export.podId'),
      minWidth: 100,
      formatter: ({ row }: { row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto }) => {
        const to = row.transportOrder;
        if (to?.bizType === 0) return to.seaExport?.pod?.portName || '--';
        if (to?.bizType === 1) return to.seaImport?.pod?.portName || '--';
        if (to?.bizType === 2) return to.airExport?.pod?.cnName || '--';
        return '--';
      },
    },
    {
      field: 'transportOrder.seaExportVessel',
      title: $t('seaExport.export.vessel'),
      minWidth: 100,
      formatter: ({ row }: { row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto }) => {
        const to = row.transportOrder;
        if (to?.bizType === 0) return to.seaExport?.carrier?.code || '--';
        if (to?.bizType === 1) return to.seaImport?.carrier?.code || '--';
        if (to?.bizType === 2) return to.airExport?.flightNo || '--';
        return '--';
      },
    },
    {
      field: 'transportOrder.pkgs',
      title: $t('seaExport.export.pkgs'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.kgs',
      title: $t('seaExport.export.grossWeight'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.codePackageName',
      title: $t('seaExport.export.orderCodeGoodss'),
      minWidth: 100,
      formatter: ({ row }: { row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto }) => {
        return row.transportOrder?.codePackage?.name || '--';
      },
    },
    {
      field: 'creatorUserName',
      title: $t('auditApproval.creatorUserName'),
      minWidth: 120,
    },
    {
      field: 'creationTime',
      title: $t('seaExport.export.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
