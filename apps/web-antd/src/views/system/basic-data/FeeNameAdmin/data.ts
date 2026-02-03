import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { FeeNameAdminApi } from '#/api/system/base-data/fee-name-admin';

import { z } from '#/adapter/form';
import { CurrencyEnum, InOutType } from '#/api/system/base-data/fee-name-admin';
import { $t } from '#/locales';

/**
 * 获取出入类型枚举选项
 */
export function useInOutTypeOptions() {
  return [
    {
      label: $t('system.basicData.feeName.inOutTypeOptions.out'),
      value: InOutType.Out,
    },
    {
      label: $t('system.basicData.feeName.inOutTypeOptions.in'),
      value: InOutType.In,
    },
  ];
}

/**
 * 获取币别枚举选项
 */
export function useCurrencyEnumOptions() {
  return [
    {
      label: $t('system.basicData.feeName.currencyEnumOptions.rmb'),
      value: CurrencyEnum.RMB,
    },
    {
      label: $t('system.basicData.feeName.currencyEnumOptions.usd'),
      value: CurrencyEnum.USD,
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
      label: $t('system.basicData.feeName.keyword'),
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
      label: $t('system.basicData.feeName.code'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.feeName.code'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.feeName.feeName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.feeName.feeName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.feeName.enName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.feeName.enName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Select',
      fieldName: 'inOutType',
      label: $t('system.basicData.feeName.inOutType'),
      componentProps: {
        options: useInOutTypeOptions(),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'defaultCurrency',
      label: $t('system.basicData.feeName.defaultCurrency'),
      defaultValue: undefined,
    },
    {
      component: 'Input',
      fieldName: 'feeTypeStr',
      label: $t('system.basicData.feeName.feeTypeStr'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.feeName.feeTypeStr'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.feeName.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.feeName.remark'),
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
  onActionClick?: OnActionClickFn<FeeNameAdminApi.FeeNameDto>,
): VxeTableGridOptions<FeeNameAdminApi.FeeNameDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.feeName.code'),
      minWidth: 100,
    },
    {
      field: 'name',
      title: $t('system.basicData.feeName.feeName'),
      minWidth: 150,
    },
    {
      field: 'enName',
      title: $t('system.basicData.feeName.enName'),
      minWidth: 150,
    },
    {
      field: 'inOutType',
      title: $t('system.basicData.feeName.inOutType'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: [
          {
            color: 'processing',
            label: $t('system.basicData.feeName.inOutTypeOptions.out'),
            value: InOutType.Out,
          },
          {
            color: 'success',
            label: $t('system.basicData.feeName.inOutTypeOptions.in'),
            value: InOutType.In,
          },
        ],
      },
    },
    {
      field: 'defaultCurrency',
      title: $t('system.basicData.feeName.defaultCurrency'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: [
          {
            color: 'error',
            label: $t('system.basicData.feeName.currencyEnumOptions.rmb'),
            value: CurrencyEnum.RMB,
          },
          {
            color: 'warning',
            label: $t('system.basicData.feeName.currencyEnumOptions.usd'),
            value: CurrencyEnum.USD,
          },
        ],
      },
    },
    {
      field: 'feeTypeStr',
      title: $t('system.basicData.feeName.feeTypeStr'),
      minWidth: 120,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.feeName.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.feeName.name'),
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
