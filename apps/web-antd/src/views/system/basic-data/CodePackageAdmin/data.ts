import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

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
      label: $t('system.basicData.codePackage.keyword'),
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
      fieldName: 'name',
      label: $t('system.basicData.codePackage.packageName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codePackage.packageName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'afrCode',
      label: $t('system.basicData.codePackage.afrCode'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codePackage.afrCode'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'ediCode',
      label: $t('system.basicData.codePackage.ediCode'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codePackage.ediCode'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.codePackage.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.codePackage.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'description',
      label: $t('system.basicData.codePackage.description'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codePackage.description'),
            500,
          ]),
        )
        .optional(),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.codePackage.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codePackage.remark'),
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
  onActionClick?: OnActionClickFn<CodePackageAdminApi.CodePackageDto>,
): VxeTableGridOptions<CodePackageAdminApi.CodePackageDto>['columns'] {
  return [
    {
      field: 'name',
      title: $t('system.basicData.codePackage.packageName'),
      minWidth: 150,
    },
    {
      field: 'description',
      title: $t('system.basicData.codePackage.description'),
      minWidth: 150,
      showOverflow: true,
    },
    {
      field: 'afrCode',
      title: $t('system.basicData.codePackage.afrCode'),
      minWidth: 100,
    },
    {
      field: 'ediCode',
      title: $t('system.basicData.codePackage.ediCode'),
      minWidth: 100,
    },
    {
      field: 'enable',
      title: $t('system.basicData.codePackage.enable'),
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
      title: $t('system.basicData.codePackage.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.codePackage.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.codePackage.name'),
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
