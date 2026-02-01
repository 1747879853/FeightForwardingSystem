import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

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
      label: $t('system.basicData.carrier.keyword'),
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
      fieldName: 'cnName',
      label: $t('system.basicData.carrier.cnName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.cnName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'cnShortName',
      label: $t('system.basicData.carrier.cnShortName'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.cnShortName'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.carrier.enName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.enName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: $t('system.basicData.carrier.code'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.code'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'otherCode',
      label: $t('system.basicData.carrier.otherCode'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.otherCode'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'ediCode',
      label: $t('system.basicData.carrier.ediCode'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.ediCode'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.carrier.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.carrier.remark'),
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
  onActionClick?: OnActionClickFn<CarrierAdminApi.CarrierDto>,
): VxeTableGridOptions<CarrierAdminApi.CarrierDto>['columns'] {
  return [
    {
      field: 'cnName',
      title: $t('system.basicData.carrier.cnName'),
      minWidth: 150,
    },
    {
      field: 'cnShortName',
      title: $t('system.basicData.carrier.cnShortName'),
      minWidth: 100,
    },
    {
      field: 'enName',
      title: $t('system.basicData.carrier.enName'),
      minWidth: 150,
    },
    {
      field: 'code',
      title: $t('system.basicData.carrier.code'),
      minWidth: 100,
    },
    {
      field: 'otherCode',
      title: $t('system.basicData.carrier.otherCode'),
      minWidth: 120,
    },
    {
      field: 'ediCode',
      title: $t('system.basicData.carrier.ediCode'),
      minWidth: 100,
    },
    {
      field: 'remark',
      title: $t('system.basicData.carrier.remark'),
      minWidth: 150,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.carrier.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'cnName',
          nameTitle: $t('system.basicData.carrier.name'),
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
