import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CodeIssueTypeAdminApi } from '#/api/system/base-data/code-issue-type-admin';

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
      label: $t('system.basicData.codeIssueType.keyword'),
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
      fieldName: 'billType',
      label: $t('system.basicData.codeIssueType.billType'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeIssueType.billType'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.codeIssueType.enName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeIssueType.enName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'noBill',
      label: $t('system.basicData.codeIssueType.noBill'),
      componentProps: {
        maxLength: 20,
      },
      rules: z
        .string()
        .max(
          20,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeIssueType.noBill'),
            20,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'copyNoBill',
      label: $t('system.basicData.codeIssueType.copyNoBill'),
      componentProps: {
        maxLength: 20,
      },
      rules: z
        .string()
        .max(
          20,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeIssueType.copyNoBill'),
            20,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'ediCode',
      label: $t('system.basicData.codeIssueType.ediCode'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeIssueType.ediCode'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.codeIssueType.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.codeIssueType.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.codeIssueType.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeIssueType.remark'),
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
  onActionClick?: OnActionClickFn<CodeIssueTypeAdminApi.CodeIssueTypeDto>,
): VxeTableGridOptions<CodeIssueTypeAdminApi.CodeIssueTypeDto>['columns'] {
  return [
    {
      field: 'billType',
      title: $t('system.basicData.codeIssueType.billType'),
      minWidth: 150,
    },
    {
      field: 'enName',
      title: $t('system.basicData.codeIssueType.enName'),
      minWidth: 150,
    },
    {
      field: 'noBill',
      title: $t('system.basicData.codeIssueType.noBill'),
      minWidth: 100,
    },
    {
      field: 'copyNoBill',
      title: $t('system.basicData.codeIssueType.copyNoBill'),
      minWidth: 100,
    },
    {
      field: 'ediCode',
      title: $t('system.basicData.codeIssueType.ediCode'),
      minWidth: 100,
    },
    {
      field: 'enable',
      title: $t('system.basicData.codeIssueType.enable'),
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
      title: $t('system.basicData.codeIssueType.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.codeIssueType.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'billType',
          nameTitle: $t('system.basicData.codeIssueType.name'),
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
