import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { getTaskStatusOptions } from '#/views/audit-approval/data';
import { $t } from '#/locales';

const t = (key: string) => $t(`auditApproval.paymentReview.${key}`);

export function usePaymentReviewFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.number'),
      componentProps: {
        placeholder: t('keywordPlaceholder'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ApplicationNo',
      label: t('applicationNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: t('settlementName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: t('currencyCode'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'SubmitTimeRange',
      label: t('submitTime'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'EndTimeRange',
      label: t('endTime'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'TaskStatus',
      label: $t('auditApproval.task.status'),
      componentProps: {
        allowClear: true,
        options: getTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'MyStatus',
      label: t('myStatus'),
      componentProps: {
        allowClear: true,
        options: getTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: t('creatorUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'AuditUserId',
      label: t('auditUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'AuditTimeRange',
      label: t('auditTime'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

export function usePaymentReviewColumns(): VxeTableGridOptions<PaymentReviewAdminApi.PayAppTaskItemDto>['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: t('applicationNo'),
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'settlementName',
      title: t('settlementName'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'currencyCode',
      title: t('currencyCode'),
      minWidth: 80,
    },
    {
      field: 'totalPayPrice',
      title: t('totalPayPrice'),
      minWidth: 120,
      align: 'right',
    },
    {
      field: 'totalReceivePrice',
      title: t('totalReceivePrice'),
      minWidth: 120,
      align: 'right',
    },
    {
      field: 'taskStatus',
      title: $t('auditApproval.task.status'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getTaskStatusOptions(),
      },
    },
    {
      field: 'myStatus',
      title: t('myStatus'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getTaskStatusOptions(),
      },
    },
    {
      field: 'submitTime',
      title: t('submitTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'endTime',
      title: t('endTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'creatorUserName',
      title: t('creatorUserName'),
      minWidth: 100,
    },
    {
      field: 'auditUserName',
      title: t('auditUserName'),
      minWidth: 100,
    },
    {
      field: 'auditTime',
      title: t('auditTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'remark',
      title: t('remark'),
      minWidth: 140,
      showOverflow: true,
    },
  ];
}
