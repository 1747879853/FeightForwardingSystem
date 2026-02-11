import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserAdminApi } from '#/api';
import { getOrganizationUnitTree } from '#/api/system/organization-unit';
import { UserStatus } from '#/api';
import { $t } from '#/locales';
import { z } from '@vben/common-ui';
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
      fieldName: 'id',
      label: 'ID',
      // 隐藏字段，用于判断是新增还是编辑模式
      dependencies: {
        show: false,
        triggerFields: ['id'],
      },
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
        autocomplete: 'off',
      },
      fieldName: 'userName',
      label: $t('system.user.userName'),
      rules: z
        .string()
        .min(2, {
          message: $t('ui.formRules.required', [$t('system.user.userName')]),
        }),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
        autocomplete: 'off',
      },
      fieldName: 'nickName',
      label: $t('system.user.nickName'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [$t('system.user.nickName')]),
        }),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        showCount: true,
        autocomplete: 'off',
      },
      dependencies: {
        triggerFields: ['emailAddress'],
        rules: (values) => {
          // 如果邮箱有值，则校验邮箱格式
          if (values.emailAddress && values.emailAddress.length > 0) {
            return z
              .string()
              .email({
                message: $t('common.invalidEmail', [$t('system.user.email')]),
              })
              .max(128, {
                message: $t('common.maxLength', [$t('system.user.email'), 128]),
              });
          }

          // 邮箱为空：不校验，字段可选
          return z.string().optional();
        },
      },
      fieldName: 'emailAddress',
      label: $t('system.user.email'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 20,
        showCount: true,
        autocomplete: 'off',
      },
      fieldName: 'phoneNumber',
      label: $t('system.user.phoneNumber'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [$t('system.user.phoneNumber')]),
        })
        .regex(/^1[3-9]\d{9}$/, {
          message: $t('common.invalidFormat', [$t('system.user.phoneNumber')]),
        }),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
        type: 'password',
        autocomplete: 'new-password',
      },
      dependencies: {
        triggerFields: ['id'],
        // 只在新增模式(id 不存在)时显示密码字段
        show: (values) => {
          return !values.id;
        },
      },
      fieldName: 'password',
      label: $t('system.user.password'),
      help: $t('system.user.passwordHelp'),
      // 新增模式时密码必填，长度 6-32 位
      rules: z
        .string()
        .min(6, {
          message: $t('common.lengthBetween', [
            $t('system.user.password'),
            6,
            32,
          ]),
        })
        .max(32, {
          message: $t('common.lengthBetween', [
            $t('system.user.password'),
            6,
            32,
          ]),
        }),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        allowClear: true,
        api: getOrganizationUnitTree,
        class: 'w-full',
        labelField: 'displayName',
        valueField: 'id',
        childrenField: 'children',
      },
      fieldName: 'organizationId',
      label: $t('system.user.department'),
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
      fieldName: 'avatar',
      label: $t('system.user.avatar'),
      component: 'FileUploadInput',
      componentProps: {
        maxSizeMB: 20,
        allowedTypes: ['png', 'jpg'],
        maxCount: 1,
      },
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
