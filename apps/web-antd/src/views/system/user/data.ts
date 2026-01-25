import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserAdminApi } from '#/api';

import { UserStatus } from '#/api';
import { $t } from '#/locales';

/** 用户状态选项 */
export const userStatusOptions = [
  {
    label: () => $t('system.user.statusNormal'),
    value: UserStatus.Passed,
    color: 'success',
  },
  {
    label: () => $t('system.user.statusPending'),
    value: UserStatus.Pending,
    color: 'warning',
  },
  {
    label: () => $t('system.user.statusDisabled'),
    value: UserStatus.Unpassed,
    color: 'error',
  },
];

/** 是否选项 */
export const booleanOptions = [
  { label: () => $t('common.yes'), value: true },
  { label: () => $t('common.no'), value: false },
];

/**
 * 用户表单 Schema
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
      },
      fieldName: 'userName',
      label: $t('system.user.userName'),
      rules: 'required|min:2|max:64',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
      },
      fieldName: 'nickName',
      label: $t('system.user.nickName'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        showCount: true,
      },
      fieldName: 'emailAddress',
      label: $t('system.user.email'),
      rules: 'email',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 20,
        showCount: true,
      },
      fieldName: 'phoneNumber',
      label: $t('system.user.phoneNumber'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
        type: 'password',
      },
      dependencies: {
        triggerFields: ['id'],
        if: (values) => !values.id,
        rules: ['required', 'min:6', 'max:32'],
      },
      fieldName: 'password',
      label: $t('system.user.password'),
      help: $t('system.user.passwordHelp'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('system.user.statusNormal'), value: true },
          { label: $t('system.user.statusDisabled'), value: false },
        ],
        optionType: 'button',
      },
      defaultValue: true,
      fieldName: 'isActive',
      label: $t('system.user.isActive'),
      // 隐藏此字段，但保留配置和默认值
      hide: true,
    },
    {
      component: 'Select',
      componentProps: {
        options: userStatusOptions.map((opt) => ({
          label: opt.label(),
          value: opt.value,
        })),
        placeholder: $t('system.user.status'),
      },
      defaultValue: UserStatus.Passed,
      fieldName: 'status',
      label: $t('system.user.status'),
    },
    // {
    //   component: 'RoleSelect',
    //   componentProps: {
    //     mode: 'multiple',
    //     placeholder: $t('system.user.selectRoles'),
    //   },
    //   fieldName: 'roleIds',
    //   label: $t('system.user.roles'),
    // },
    {
      component: 'Input',
      componentProps: {
        maxlength: 256,
        showCount: true,
      },
      fieldName: 'avatar',
      label: $t('system.user.avatar'),
    },
  ];
}

/**
 * 用户列表搜索表单 Schema
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'KeyWords',
      label: $t('system.user.keyword'),
    },
    // {
    //   component: 'Select',
    //   componentProps: {
    //     allowClear: true,
    //     options: [
    //       { label: $t('common.yes'), value: true },
    //       { label: $t('common.no'), value: false },
    //     ],
    //     placeholder: $t('system.user.isActive'),
    //   },
    //   fieldName: 'IsActive',
    //   label: $t('system.user.isActive'),
    // },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: userStatusOptions.map((opt) => ({
          label: opt.label(),
          value: opt.value,
        })),
        placeholder: $t('system.user.status'),
      },
      fieldName: 'Status',
      label: $t('system.user.status'),
    },
    {
      component: 'RoleSelect',
      componentProps: {
        allowClear: true,
        placeholder: $t('system.user.selectRole'),
      },
      fieldName: 'RoleId',
      label: $t('system.role.name'),
    },
  ];
}

/**
 * 用户列表列定义
 */
export function useColumns<T = SystemUserAdminApi.SystemUser>(
  onActionClick: OnActionClickFn<T>,
  onStatusChange?: (newStatus: any, row: T) => PromiseLike<boolean | undefined>,
): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
    },
    {
      field: 'id',
      title: $t('system.user.id'),
      width: 80,
    },
    {
      field: 'userName',
      title: $t('system.user.userName'),
      minWidth: 120,
    },
    {
      field: 'nickName',
      title: $t('system.user.nickName'),
      minWidth: 120,
    },
    {
      field: 'emailAddress',
      title: $t('system.user.email'),
      minWidth: 180,
    },
    {
      field: 'phoneNumber',
      title: $t('system.user.phoneNumber'),
      minWidth: 130,
    },
    {
      field: 'roles',
      title: $t('system.user.roles'),
      minWidth: 150,
      formatter: ({ cellValue }) => {
        if (Array.isArray(cellValue)) {
          return cellValue.join(', ');
        }
        return cellValue || '-';
      },
    },
    // {
    //   cellRender: {
    //     name: 'CellSwitch',
    //     events: {
    //       change: onStatusChange,
    //     },
    //   },
    //   field: 'isActive',
    //   title: $t('system.user.isActive'),
    //   width: 100,
    // },
    {
      cellRender: {
        name: 'CellTag',
        options: userStatusOptions.map((opt) => ({
          color: opt.color,
          label: opt.label(),
          value: opt.value,
        })),
      },
      field: 'status',
      title: $t('system.user.status'),
      width: 100,
    },
    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.user.createTime'),
      width: 170,
    },
    {
      field: 'lastLoginTime',
      formatter: 'formatDateTime',
      title: $t('system.user.lastLoginTime'),
      width: 170,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'userName',
          nameTitle: $t('system.user.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'edit', text: $t('common.edit') },
          { code: 'setRoles', text: $t('system.user.setRoles') },
          { code: 'permission', text: $t('system.user.permission') },
          // { code: 'resetPermission', text: $t('system.user.resetPermission') },
          { code: 'changePassword', text: $t('system.user.changePassword') },
          { code: 'delete', text: $t('common.delete'), danger: true },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.user.operation'),
      width: 420,
    },
  ];
}

/**
 * 改密表单 Schema
 */
export function usePasswordFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
        type: 'password',
      },
      fieldName: 'newPassword',
      label: $t('system.user.newPassword'),
      rules: 'required|min:6|max:32',
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
        type: 'password',
      },
      fieldName: 'confirmPassword',
      label: $t('system.user.confirmPassword'),
      rules: [
        { required: true, message: $t('system.user.confirmPasswordRequired') },
      ],
    },
    {
      component: 'Checkbox',
      fieldName: 'unlock',
      label: '',
      renderComponentContent: () => $t('system.user.unlockUser'),
    },
  ];
}
