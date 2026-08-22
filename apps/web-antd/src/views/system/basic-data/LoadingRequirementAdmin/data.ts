import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { LoadingRequirementAdminApi } from '#/api/system/base-data/loading-requirement-admin';

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
      label: $t('system.basicData.loadingRequirement.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置（主表字段，不含明细）
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.loadingRequirement.requirementName'),
      componentProps: {
        maxLength: 128,
      },
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.loadingRequirement.requirementName'),
          ]),
        })
        .max(
          128,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.loadingRequirement.requirementName'),
            128,
          ]),
        ),
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.loadingRequirement.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.loadingRequirement.remark'),
      componentProps: {
        maxLength: 1024,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          1024,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.loadingRequirement.remark'),
            1024,
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
  onActionClick?: OnActionClickFn<LoadingRequirementAdminApi.LoadingRequirementDto>,
): VxeTableGridOptions<LoadingRequirementAdminApi.LoadingRequirementDto>['columns'] {
  return [
    {
      field: 'name',
      title: $t('system.basicData.loadingRequirement.requirementName'),
      minWidth: 180,
    },
    {
      field: 'sortId',
      title: $t('system.basicData.loadingRequirement.sortId'),
      minWidth: 80,
    },
    {
      field: 'loadingRequirementItems',
      title: $t('system.basicData.loadingRequirement.itemCount'),
      minWidth: 100,
      formatter: ({ cellValue }) =>
        Array.isArray(cellValue) ? String(cellValue.length) : '0',
    },
    {
      field: 'remark',
      title: $t('system.basicData.loadingRequirement.remark'),
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'creatorUserName',
      title: $t('system.basicData.loadingRequirement.creatorUserName'),
      minWidth: 120,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.loadingRequirement.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.loadingRequirement.name'),
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
