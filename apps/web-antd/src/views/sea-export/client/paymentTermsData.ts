import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { $t } from '#/locales';
import form from 'ant-design-vue/es/form';

import { useVbenForm } from '#/adapter/form';

/**
 * 业务类型枚举
 */
export const BusinessTypeOptions = [
  {
    value: 0,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.seaExport'),
  },
  {
    value: 1,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.seaImport'),
  },
];

/**
 * 结算方式枚举选项
 */
export const SettlementTypeOptions = [
  {
    value: 0,
    label: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.ticketSettlement',
    ),
  },
  {
    value: 1,
    label: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.monthlySettlement',
    ),
  },
  {
    value: 2,
    label: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.appointedDaySettlement',
    ),
  },
];

/**
 * 间隔月份枚举选项
 */
export const MonthsOptions = [
  { value: 1, label: $t('seaExport.client.paymentTerms.monthsOptions.1') },
  { value: 2, label: $t('seaExport.client.paymentTerms.monthsOptions.2') },
  { value: 3, label: $t('seaExport.client.paymentTerms.monthsOptions.3') },
  { value: 4, label: $t('seaExport.client.paymentTerms.monthsOptions.4') },
  { value: 5, label: $t('seaExport.client.paymentTerms.monthsOptions.5') },
  { value: 6, label: $t('seaExport.client.paymentTerms.monthsOptions.6') },
  { value: 7, label: $t('seaExport.client.paymentTerms.monthsOptions.7') },
  { value: 8, label: $t('seaExport.client.paymentTerms.monthsOptions.8') },
  { value: 9, label: $t('seaExport.client.paymentTerms.monthsOptions.9') },
  { value: 10, label: $t('seaExport.client.paymentTerms.monthsOptions.10') },
  { value: 11, label: $t('seaExport.client.paymentTerms.monthsOptions.11') },
  { value: 12, label: $t('seaExport.client.paymentTerms.monthsOptions.12') },
];

/**结算日枚举选项 */
export const SettlementDayOptions = [
  {
    value: 1,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.1'),
  },
  {
    value: 2,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.2'),
  },
  {
    value: 3,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.3'),
  },
  {
    value: 4,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.4'),
  },
  {
    value: 5,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.5'),
  },
  {
    value: 6,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.6'),
  },
  {
    value: 7,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.7'),
  },
  {
    value: 8,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.8'),
  },
  {
    value: 9,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.9'),
  },
  {
    value: 10,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.10'),
  },
  {
    value: 11,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.11'),
  },
  {
    value: 12,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.12'),
  },
  {
    value: 13,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.13'),
  },
  {
    value: 14,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.14'),
  },
  {
    value: 15,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.15'),
  },
  {
    value: 16,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.16'),
  },
  {
    value: 17,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.17'),
  },
  {
    value: 18,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.18'),
  },
  {
    value: 19,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.19'),
  },
  {
    value: 20,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.20'),
  },
  {
    value: 21,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.21'),
  },
  {
    value: 22,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.22'),
  },
  {
    value: 23,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.23'),
  },
  {
    value: 24,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.24'),
  },
  {
    value: 25,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.25'),
  },
  {
    value: 26,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.26'),
  },
  {
    value: 27,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.27'),
  },
  {
    value: 28,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.28'),
  },
  {
    value: 29,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.29'),
  },
  {
    value: 30,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.30'),
  },
  {
    value: 31,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.31'),
  },
];

/**
 * 新增/编辑客户账单 schema
 */
export function useBillFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      fieldName: 'effectiveTime',
      label: $t('seaExport.client.paymentTerms.effectiveTime'),
      componentProps: { class: 'w-full' },
    },
    {
      component: 'DatePicker',
      fieldName: 'expiringTime',
      label: $t('seaExport.client.paymentTerms.expirationTime'),
      componentProps: {
        class: 'w-full',
        disabled: false, // 默认不禁用，根据需要调整
      },
    },
    {
      component: 'Switch',
      fieldName: 'permanent',
      label: $t('seaExport.client.paymentTerms.longTermValid'),
      defaultValue: false,
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceIds',
      label: $t('seaExport.client.paymentTerms.codeSource'),
      componentProps: {
        mode: 'multiple',
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'userIds',
      label: $t('seaExport.client.paymentTerms.user'),
      componentProps: {
        mode: 'multiple',
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'bizTypes',
      label: $t('seaExport.client.paymentTerms.BizType'),
      componentProps: {
        allowClear: true,
        options: BusinessTypeOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        mode: 'multiple',
      },
      defaultValue: [0],
    },
    {
      component: 'Select',
      fieldName: 'settlementType',
      label: $t('seaExport.client.paymentTerms.settlementType'),
      defaultValue: 0,
      componentProps: {
        allowClear: true,
        options: SettlementTypeOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        onChange: (value: number) => {
          console.log('Selected settlement type:', value);
        },
      },
    },
    {
      component: 'Select',
      fieldName: 'months',
      label: $t('seaExport.client.paymentTerms.months'),
      // show: (formData: any) => {
      //   return formData.settlementType === 1;
      // },
      /** 是否隐藏表单项 */
      hide: false,
      componentProps: {
        allowClear: true,
        options: MonthsOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'settlementDay',
      label: $t('seaExport.client.paymentTerms.settlementDay'),
      hide: false,
      componentProps: {
        allowClear: true,
        options: SettlementDayOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      hide: false,
      fieldName: 'days',
      label: $t('seaExport.client.paymentTerms.days'),
    },
    {
      component: 'Textarea',
      hide: false,
      fieldName: 'remark',
      label: $t('seaExport.client.paymentTerms.remark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        class: 'w-full',
      },
    },
  ];
}
