import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { GenerateNumAdminApi } from '#/api/system/base-data/generate-num-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Name',
      label: $t('system.basicData.generateNum.name'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'TableName',
      label: $t('system.basicData.generateNum.tableName'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'UserId',
      label: $t('system.basicData.generateNum.userId'),
      componentProps: {
        allowClear: true,
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置（主表字段，不含规则明细）
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.generateNum.name'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.generateNum.name'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'tableName',
      label: $t('system.basicData.generateNum.tableName'),
      componentProps: {
        maxLength: 200,
      },
      rules: z
        .string()
        .max(
          200,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.generateNum.tableName'),
            200,
          ]),
        )
        .optional(),
    },
    {
      component: 'UserSelect',
      fieldName: 'userId',
      label: $t('system.basicData.generateNum.userId'),
      componentProps: {
        allowClear: true,
      },
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<GenerateNumAdminApi.GenerateNumDto>,
): VxeTableGridOptions<GenerateNumAdminApi.GenerateNumDto>['columns'] {
  return [
    {
      field: 'name',
      title: $t('system.basicData.generateNum.name'),
      minWidth: 150,
    },
    {
      field: 'tableName',
      title: $t('system.basicData.generateNum.tableName'),
      minWidth: 180,
    },
    {
      field: 'userId',
      title: $t('system.basicData.generateNum.userId'),
      minWidth: 100,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.generateNum.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.generateNum.name'),
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
