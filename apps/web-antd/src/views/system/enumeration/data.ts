import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { $t } from '#/locales';

/**
 * 表单配置（新增/编辑枚举）
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        showCount: true,
      },
      fieldName: 'name',
      label: $t('system.enumeration.enumName'),
      rules: 'required|min:1|max:128',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 500,
        showCount: true,
      },
      fieldName: 'description',
      label: $t('system.enumeration.description'),
    },
  ];
}

/**
 * 列表搜索表单配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.enumeration.keyword'),
    },
  ];
}

/**
 * 表格列配置
 */
export function useColumns<T = EnumerationAdminApi.EnumerationListDto>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      title: $t('common.index'),
      width: 60,
      fixed: 'left',
    },
    {
      field: 'name',
      title: $t('system.enumeration.enumName'),
      minWidth: 150,
    },
    {
      field: 'description',
      title: $t('system.enumeration.description'),
      minWidth: 200,
    },
    // {
    //   field: 'remark',
    //   title: $t('system.enumeration.remark'),
    //   minWidth: 200,
    // },
    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.enumeration.creationTime'),
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.enumeration.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'view', text: $t('common.view') },
          { code: 'edit', text: $t('common.edit') },
          { code: 'delete', danger: true, text: $t('common.delete') },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.enumeration.operation'),
      width: 200,
    },
  ];
}
