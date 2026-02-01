import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.exchangeRate.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置
 * @param currencyOptions 币别下拉选项
 */
export function useFormSchema(
  currencyOptions: Array<{ label: string; value: number }> = [],
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'currencyId',
      label: $t('system.basicData.exchangeRate.currencyId'),
      componentProps: {
        options: currencyOptions,
        allowClear: true,
        showSearch: true,
        filterOption: (input: string, option: { label: string }) =>
          option.label.toLowerCase().includes(input.toLowerCase()),
        class: 'w-full',
      },
      rules: z.number({
        required_error: $t('ui.formRules.selectRequired', [
          $t('system.basicData.exchangeRate.currencyId'),
        ]),
      }),
    },
    {
      component: 'InputNumber',
      fieldName: 'drValue',
      label: $t('system.basicData.exchangeRate.drValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'crValue',
      label: $t('system.basicData.exchangeRate.crValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'customValue',
      label: $t('system.basicData.exchangeRate.customValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'calculateValue',
      label: $t('system.basicData.exchangeRate.calculateValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'invoiceValue',
      label: $t('system.basicData.exchangeRate.invoiceValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'startDate',
      label: $t('system.basicData.exchangeRate.startDate'),
      componentProps: {
        style: { width: '100%' },
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'endDate',
      label: $t('system.basicData.exchangeRate.endDate'),
      componentProps: {
        style: { width: '100%' },
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'Input',
      fieldName: 'localCurrency',
      label: $t('system.basicData.exchangeRate.localCurrency'),
      componentProps: {
        maxLength: 20,
      },
      rules: z
        .string()
        .max(
          20,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.exchangeRate.localCurrency'),
            20,
          ]),
        )
        .optional(),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.exchangeRate.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.exchangeRate.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.exchangeRate.remark'),
      formItemClass: 'col-span-2',
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.exchangeRate.remark'),
            500,
          ]),
        )
        .optional(),
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<ExchangeRateAdminApi.ExchangeRateDto>,
): VxeTableGridOptions<ExchangeRateAdminApi.ExchangeRateDto>['columns'] {
  return [
    {
      field: 'currencyId',
      title: $t('system.basicData.exchangeRate.currencyId'),
      minWidth: 100,
    },
    {
      field: 'drValue',
      title: $t('system.basicData.exchangeRate.drValue'),
      minWidth: 100,
    },
    {
      field: 'crValue',
      title: $t('system.basicData.exchangeRate.crValue'),
      minWidth: 100,
    },
    {
      field: 'customValue',
      title: $t('system.basicData.exchangeRate.customValue'),
      minWidth: 100,
    },
    {
      field: 'calculateValue',
      title: $t('system.basicData.exchangeRate.calculateValue'),
      minWidth: 100,
    },
    {
      field: 'invoiceValue',
      title: $t('system.basicData.exchangeRate.invoiceValue'),
      minWidth: 100,
    },
    {
      field: 'startDate',
      title: $t('system.basicData.exchangeRate.startDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'endDate',
      title: $t('system.basicData.exchangeRate.endDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'enable',
      title: $t('system.basicData.exchangeRate.enable'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.enabled'), value: true },
          { color: 'default', label: $t('common.disabled'), value: false },
        ],
      },
    },
    {
      field: 'sortId',
      title: $t('system.basicData.exchangeRate.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.exchangeRate.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'currencyId',
          nameTitle: $t('system.basicData.exchangeRate.name'),
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
