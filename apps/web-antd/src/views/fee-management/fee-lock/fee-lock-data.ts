import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { BusinessTypeOptions } from '#/views/client/paymentTermsData';

const getFeeLockedOptions = () => [
  {
    value: true,
    label: $t('seaExport.export.isFeeLocking'),
    color: 'warning',
  },
  {
    value: false,
    label: $t('seaExport.export.noFeeLocking'),
    color: 'success',
  },
];

const getRowTypeOptions = () => [
  {
    value: 'order',
    label: $t('seaExport.export.feeLock.rowTypeOrder'),
    color: 'processing',
  },
  {
    value: 'change',
    label: $t('seaExport.export.feeLock.rowTypeChangeOrder'),
    color: 'default',
  },
];

export interface FeeLockTreeRow {
  id: string;
  rowType: 'change' | 'order';
  transportOrderId: number;
  changeOrderId?: number;
  bizType?: number;
  commissionNum?: string;
  mblNum?: string;
  bookingNum?: string;
  clientName?: string;
  accountDate?: string;
  etd?: string;
  feeLocked?: boolean;
  feeLockedTime?: string;
  feeUnLockedTime?: string;
  reason?: string;
  remark?: string;
  children?: FeeLockTreeRow[];
}

export function useFeeLockGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'FeeLocked',
      label: $t('seaExport.export.isFeeLocking'),
      componentProps: {
        allowClear: true,
        options: getFeeLockedOptions().map(({ label, value }) => ({
          label,
          value,
        })),
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
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.number'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
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
      fieldName: 'AccountDateStart',
      label: $t('seaExport.export.feeLock.accountDateStart'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
        picker: 'month',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'AccountDateEnd',
      label: $t('seaExport.export.feeLock.accountDateEnd'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
        picker: 'month',
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
  ];
}

export function useFeeLockColumns(): VxeTableGridOptions<FeeLockTreeRow>['columns'] {
  return [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      field: 'rowType',
      title: $t('seaExport.export.feeLock.rowType'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: getRowTypeOptions(),
      },
    },
    {
      field: 'bizType',
      title: $t('seaExport.client.paymentTerms.BizType'),
      minWidth: 110,
      cellRender: {
        name: 'CellTag',
        options: BusinessTypeOptions,
      },
    },
    {
      field: 'commissionNum',
      title: $t('seaExport.export.commissionNum'),
      minWidth: 140,
    },
    {
      field: 'mblNum',
      title: $t('seaExport.export.mblNum'),
      minWidth: 140,
    },
    {
      field: 'bookingNum',
      title: $t('seaExport.export.bookingNum'),
      minWidth: 140,
    },
    {
      field: 'clientName',
      title: $t('seaExport.export.clientId'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'accountDate',
      title: $t('seaExport.export.accountDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'etd',
      title: $t('seaExport.export.etd'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'feeLocked',
      title: $t('seaExport.export.isFeeLocking'),
      minWidth: 120,
      cellRender: {
        name: 'CellTag',
        options: getFeeLockedOptions(),
      },
    },
    {
      field: 'feeLockedTime',
      title: $t('seaExport.export.feeLock.feeLockedTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'feeUnLockedTime',
      title: $t('seaExport.export.feeLock.feeUnLockedTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'reason',
      title: $t('seaExport.export.feeLock.changeOrderReason'),
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'remark',
      title: $t('seaExport.export.remark'),
      minWidth: 160,
      showOverflow: true,
    },
  ];
}
