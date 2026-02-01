import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

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
      label: $t('system.basicData.currency.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
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
      label: $t('system.basicData.currency.code'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.code'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'cnName',
      label: $t('system.basicData.currency.cnName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.cnName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.currency.enName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.enName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'description',
      label: $t('system.basicData.currency.description'),
      componentProps: {
        maxLength: 200,
      },
      rules: z
        .string()
        .max(
          200,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.description'),
            200,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'financeSoftCode',
      label: $t('system.basicData.currency.financeSoftCode'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.financeSoftCode'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'InputNumber',
      fieldName: 'defaultRate',
      label: $t('system.basicData.currency.defaultRate'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'Input',
      fieldName: 'alias',
      label: $t('system.basicData.currency.alias'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.alias'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.currency.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.currency.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.currency.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.currency.remark'),
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
  onActionClick?: OnActionClickFn<CurrencyAdminApi.CurrencyDto>,
): VxeTableGridOptions<CurrencyAdminApi.CurrencyDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.currency.code'),
      minWidth: 100,
    },
    {
      field: 'cnName',
      title: $t('system.basicData.currency.cnName'),
      minWidth: 120,
    },
    {
      field: 'enName',
      title: $t('system.basicData.currency.enName'),
      minWidth: 120,
    },
    {
      field: 'defaultRate',
      title: $t('system.basicData.currency.defaultRate'),
      minWidth: 120,
    },
    {
      field: 'alias',
      title: $t('system.basicData.currency.alias'),
      minWidth: 100,
    },
    {
      field: 'enable',
      title: $t('system.basicData.currency.enable'),
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
      title: $t('system.basicData.currency.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.currency.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'cnName',
          nameTitle: $t('system.basicData.currency.name'),
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
