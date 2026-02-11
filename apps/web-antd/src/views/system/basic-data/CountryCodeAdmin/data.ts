import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CountryCodeAdminApi } from '#/api/system/base-data/country-code-admin';

import { $t } from '#/locales';
import { z } from '#/adapter/form';
const getStatusOptions = () => [
  { color: 'success', label: $t('common.enabled'), value: 0 },
  { color: 'default', label: $t('common.disabled'), value: 1 },
];

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.countryCode.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('system.basicData.countryCode.status'),
      defaultValue: undefined,
      componentProps: {
        allowClear: true,
        options: getStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'code',
      label: $t('system.basicData.countryCode.code'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.countryCode.code'),
          ]),
        }),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'countryName',
      label: $t('system.basicData.countryCode.countryName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'countryEnName',
      label: $t('system.basicData.countryCode.countryEnName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'chau',
      label: $t('system.basicData.countryCode.chau'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'capital',
      label: $t('system.basicData.countryCode.capital'),
      componentProps: { allowClear: true },
    },
    {
      component: 'InputNumber',
      fieldName: 'tariff',
      label: $t('system.basicData.countryCode.tariff'),
      componentProps: { class: 'w-full', precision: 0 },
    },
    {
      component: 'InputNumber',
      fieldName: 'tonnageTax',
      label: $t('system.basicData.countryCode.tonnageTax'),
      componentProps: { class: 'w-full', precision: 0 },
    },
    {
      component: 'Input',
      fieldName: 'countryCode3',
      label: $t('system.basicData.countryCode.countryCode3'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Textarea',
      fieldName: 'explain',
      label: $t('system.basicData.countryCode.explain'),
      componentProps: { allowClear: true, rows: 3 },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.countryCode.remark'),
      componentProps: { allowClear: true, rows: 3 },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('system.basicData.countryCode.status'),
      defaultValue: 0,
      componentProps: {
        allowClear: true,
        options: getStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<CountryCodeAdminApi.CountryCodeDto>,
): VxeTableGridOptions<CountryCodeAdminApi.CountryCodeDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.countryCode.code'),
      minWidth: 120,
    },
    {
      field: 'countryName',
      title: $t('system.basicData.countryCode.countryName'),
      minWidth: 160,
    },
    {
      field: 'countryEnName',
      title: $t('system.basicData.countryCode.countryEnName'),
      minWidth: 160,
    },
    {
      field: 'chau',
      title: $t('system.basicData.countryCode.chau'),
      minWidth: 120,
    },
    {
      field: 'capital',
      title: $t('system.basicData.countryCode.capital'),
      minWidth: 120,
    },
    {
      field: 'tariff',
      title: $t('system.basicData.countryCode.tariff'),
      minWidth: 120,
    },
    {
      field: 'tonnageTax',
      title: $t('system.basicData.countryCode.tonnageTax'),
      minWidth: 120,
    },
    {
      field: 'countryCode3',
      title: $t('system.basicData.countryCode.countryCode3'),
      minWidth: 120,
    },
    {
      field: 'status',
      title: $t('system.basicData.countryCode.status'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: getStatusOptions(),
      },
    },
    {
      field: 'remark',
      title: $t('system.basicData.countryCode.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.countryCode.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'countryName',
          nameTitle: $t('system.basicData.countryCode.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('system.basicData.operation'),
      width: 150,
    },
  ];
}
