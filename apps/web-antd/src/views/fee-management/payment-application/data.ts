import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { $t } from '#/locales';

const getPaymentApplicationStatusOptions = () => [
  {
    value: 0,
    label: $t('seaExport.export.paymentApplication.entering'),
    color: 'default',
  },
  {
    value: 1,
    label: $t('seaExport.export.paymentApplication.auditing'),
    color: 'processing',
  },
  {
    value: -1,
    label: $t('seaExport.export.paymentApplication.rejected'),
    color: 'error',
  },
  {
    value: 2,
    label: $t('seaExport.export.paymentApplication.passed'),
    color: 'success',
  },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.number'),
      componentProps: {
        placeholder: $t(
          'seaExport.export.paymentApplication.keywordPlaceholder',
        ),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ApplicationNo',
      label: $t('seaExport.export.paymentApplication.applicationNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('seaExport.export.paymentApplication.status'),
      componentProps: {
        allowClear: true,
        options: getPaymentApplicationStatusOptions().map(
          ({ label, value }) => ({ label, value }),
        ),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'SettlementId',
      label: $t('seaExport.export.paymentApplication.clientName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'CurrencyId',
      label: $t('seaExport.export.paymentApplication.currencyCode'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'SubmitTimeRange',
      label: $t('seaExport.export.paymentApplication.submitTime'),
      componentProps: {
        placeholder: [
          $t('seaExport.export.paymentApplication.submitTimeStart'),
          $t('seaExport.export.paymentApplication.submitTimeEnd'),
        ],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'EndTimeRange',
      label: $t('seaExport.export.paymentApplication.endTime'),
      componentProps: {
        placeholder: [
          $t('seaExport.export.paymentApplication.endTimeStart'),
          $t('seaExport.export.paymentApplication.endTimeEnd'),
        ],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: $t('seaExport.export.paymentApplication.creatorUserName'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

export function useColumns(): VxeTableGridOptions<PaymentApplicationAdminApi.PaymentApplicationDto>['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: $t('seaExport.export.paymentApplication.applicationNo'),
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'status',
      title: $t('seaExport.export.paymentApplication.status'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getPaymentApplicationStatusOptions(),
      },
    },
    {
      field: 'clientName',
      title: $t('seaExport.export.paymentApplication.clientName'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'currencyCode',
      title: $t('seaExport.export.paymentApplication.currencyCode'),
      minWidth: 80,
    },
    {
      field: 'totalPayPrice',
      title: $t('seaExport.export.paymentApplication.totalPayPrice'),
      minWidth: 120,
      align: 'right',
    },
    {
      field: 'totalReceivePrice',
      title: $t('seaExport.export.paymentApplication.totalReceivePrice'),
      minWidth: 120,
      align: 'right',
    },
    {
      field: 'creatorUserName',
      title: $t('seaExport.export.paymentApplication.creatorUserName'),
      minWidth: 100,
    },
    {
      field: 'require',
      title: $t('seaExport.export.paymentApplication.require'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'remark',
      title: $t('seaExport.export.paymentApplication.remark'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'submitTime',
      title: $t('seaExport.export.paymentApplication.submitTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'endTime',
      title: $t('seaExport.export.paymentApplication.endTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'creationTime',
      title: $t('seaExport.export.paymentApplication.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
