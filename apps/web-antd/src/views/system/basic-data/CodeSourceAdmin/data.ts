import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CodeSourceAdminApi } from '#/api/system/base-data/code-source-admin';

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
      label: $t('system.basicData.codeSource.keyword'),
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
      label: $t('system.basicData.codeSource.code'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeSource.code'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'cnName',
      label: $t('system.basicData.codeSource.cnName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeSource.cnName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.codeSource.enName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeSource.enName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.codeSource.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.codeSource.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.codeSource.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeSource.remark'),
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
  onActionClick?: OnActionClickFn<CodeSourceAdminApi.CodeSourceDto>,
): VxeTableGridOptions<CodeSourceAdminApi.CodeSourceDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.codeSource.code'),
      minWidth: 100,
    },
    {
      field: 'cnName',
      title: $t('system.basicData.codeSource.cnName'),
      minWidth: 150,
    },
    {
      field: 'enName',
      title: $t('system.basicData.codeSource.enName'),
      minWidth: 150,
    },
    {
      field: 'enable',
      title: $t('system.basicData.codeSource.enable'),
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
      title: $t('system.basicData.codeSource.sortId'),
      minWidth: 80,
    },
    {
      field: 'remark',
      title: $t('system.basicData.codeSource.remark'),
      minWidth: 150,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.codeSource.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'cnName',
          nameTitle: $t('system.basicData.codeSource.name'),
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
