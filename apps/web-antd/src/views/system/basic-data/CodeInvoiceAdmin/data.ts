import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CodeInvoiceAdminApi } from '#/api/system/base-data/code-invoice-admin';

import { z } from '#/adapter/form';
import { ZeroTaxRateEnum } from '#/api/system/base-data/code-invoice-admin';
import { $t } from '#/locales';

/**
 * 获取零税率枚举选项
 */
export function useZeroTaxRateOptions() {
  return [
    {
      label: $t('system.basicData.codeInvoice.zeroTaxRateEnumOptions.nonZero'),
      value: ZeroTaxRateEnum.NonZero,
    },
    {
      label: $t(
        'system.basicData.codeInvoice.zeroTaxRateEnumOptions.exemption',
      ),
      value: ZeroTaxRateEnum.Exemption,
    },
    {
      label: $t(
        'system.basicData.codeInvoice.zeroTaxRateEnumOptions.notLevied',
      ),
      value: ZeroTaxRateEnum.NotLevied,
    },
    {
      label: $t('system.basicData.codeInvoice.zeroTaxRateEnumOptions.ordinary'),
      value: ZeroTaxRateEnum.Ordinary,
    },
    {
      label: $t(
        'system.basicData.codeInvoice.zeroTaxRateEnumOptions.exportTaxRebate',
      ),
      value: ZeroTaxRateEnum.ExportTaxRebate,
    },
  ];
}

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.codeInvoice.keyword'),
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
      label: $t('system.basicData.codeInvoice.code'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeInvoice.code'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.codeInvoice.codeName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeInvoice.codeName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'taxCategory',
      label: $t('system.basicData.codeInvoice.taxCategory'),
      componentProps: {
        maxLength: 100,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'taxRate',
      label: $t('system.basicData.codeInvoice.taxRate'),
      componentProps: {
        min: 0,
        max: 100,
        precision: 2,
        style: { width: '100%' },
      },
      rules: z.number(),
      // .min(0, $t('ui.formRules.min', [$t('system.basicData.codeInvoice.taxRate'), 0]))
      // .max(100, $t('ui.formRules.max', [$t('system.basicData.codeInvoice.taxRate'), 100])),
    },
    {
      component: 'Select',
      fieldName: 'zeroTaxRateEnum',
      label: $t('system.basicData.codeInvoice.zeroTaxRateEnum'),

      componentProps: {
        options: useZeroTaxRateOptions(),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'taxClassificationCode',
      label: $t('system.basicData.codeInvoice.taxClassificationCode'),
      componentProps: {
        maxLength: 50,
      },
    },
    {
      component: 'Input',
      fieldName: 'taxClassificationName',
      label: $t('system.basicData.codeInvoice.taxClassificationName'),
      componentProps: {
        maxLength: 100,
      },
    },
    {
      component: 'Switch',
      fieldName: 'isIncludingTax',
      label: $t('system.basicData.codeInvoice.isIncludingTax'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'hasPreferentialPolicy',
      label: $t('system.basicData.codeInvoice.hasPreferentialPolicy'),
      defaultValue: false,
    },
    {
      component: 'Input',
      fieldName: 'preferentialPolicyDescription',
      label: $t('system.basicData.codeInvoice.preferentialPolicyDescription'),
      dependencies: {
        triggerFields: ['hasPreferentialPolicy'],
        if(values) {
          return values.hasPreferentialPolicy === true;
        },
      },
      componentProps: {
        maxLength: 200,
      },
    },
    {
      component: 'Switch',
      fieldName: 'isDefault',
      label: $t('system.basicData.codeInvoice.isDefault'),
      defaultValue: false,
    },
    {
      component: 'Input',
      fieldName: 'defaultCurrency',
      label: $t('system.basicData.codeInvoice.defaultCurrency'),
      componentProps: {
        maxLength: 10,
      },
    },
    {
      component: 'Input',
      fieldName: 'specification',
      label: $t('system.basicData.codeInvoice.specification'),
      componentProps: {
        maxLength: 100,
      },
    },
    {
      component: 'Input',
      fieldName: 'unit',
      label: $t('system.basicData.codeInvoice.unit'),
      componentProps: {
        maxLength: 20,
      },
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.codeInvoice.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.codeInvoice.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.codeInvoice.remark'),
      formItemClass: 'col-span-2',
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<CodeInvoiceAdminApi.CodeInvoiceDto>,
): VxeTableGridOptions<CodeInvoiceAdminApi.CodeInvoiceDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.codeInvoice.code'),
      minWidth: 100,
    },
    {
      field: 'name',
      title: $t('system.basicData.codeInvoice.codeName'),
      minWidth: 150,
    },
    {
      field: 'taxCategory',
      title: $t('system.basicData.codeInvoice.taxCategory'),
      minWidth: 100,
    },
    {
      field: 'taxRate',
      title: $t('system.basicData.codeInvoice.taxRate'),
      minWidth: 80,
    },
    {
      field: 'taxClassificationCode',
      title: $t('system.basicData.codeInvoice.taxClassificationCode'),
      minWidth: 120,
    },
    {
      field: 'enable',
      title: $t('system.basicData.codeInvoice.enable'),
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
      title: $t('system.basicData.codeInvoice.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.codeInvoice.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.codeInvoice.name'),
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
