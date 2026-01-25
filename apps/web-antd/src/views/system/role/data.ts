import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { $t } from '#/locales';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
      },
      fieldName: 'name',
      label: $t('system.role.roleCode'),
      rules: 'required|min:1|max:32',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
      },
      fieldName: 'displayName',
      label: $t('system.role.roleName'),
      rules: 'required|min:1|max:64',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        optionType: 'button',
      },
      defaultValue: false,
      fieldName: 'isDefault',
      label: $t('system.role.isDefault'),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 5000,
        rows: 4,
        showCount: true,
      },
      fieldName: 'description',
      label: $t('system.role.description'),
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'KeyWords',
      label: $t('system.role.keyword'),
    },
  ];
}

export function useColumns<T = SystemRoleApi.SystemRole>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: $t('system.role.id'),
    },
    {
      field: 'name',
      title: $t('system.role.roleCode'),
    },
    {
      field: 'displayName',
      title: $t('system.role.roleName'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: '是', value: true },
          { color: 'default', label: '否', value: false },
        ],
      },
      field: 'isDefault',
      title: $t('system.role.isDefault'),
    },

    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.role.createTime'),
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'displayName',
          nameTitle: $t('system.role.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.role.operation'),
    },
  ];
}
