import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserAdminApi } from '#/api';

import { getOrganizationUnitTree } from '#/api/system/organization-unit';
import { UserAttribute, UserStatus } from '#/api';
import { $t } from '#/locales';
import { z } from '@vben/common-ui';

const userAttributeValues = [
  UserAttribute.Operation,
  UserAttribute.CustomerService,
  UserAttribute.Documentation,
  UserAttribute.Business,
  UserAttribute.Sales,
  UserAttribute.Finance,
  UserAttribute.OverseasCustomerService,
  UserAttribute.HR,
];

/** 用户属性选项（位标志枚举） */
export function getUserAttributeOptions() {
  return [
    {
      label: $t('system.user.userAttributeOptions.operation'),
      value: UserAttribute.Operation,
    },
    {
      label: $t('system.user.userAttributeOptions.customerService'),
      value: UserAttribute.CustomerService,
    },
    {
      label: $t('system.user.userAttributeOptions.documentation'),
      value: UserAttribute.Documentation,
    },
    {
      label: $t('system.user.userAttributeOptions.business'),
      value: UserAttribute.Business,
    },
    {
      label: $t('system.user.userAttributeOptions.sales'),
      value: UserAttribute.Sales,
    },
    {
      label: $t('system.user.userAttributeOptions.finance'),
      value: UserAttribute.Finance,
    },
    {
      label: $t('system.user.userAttributeOptions.overseasCustomerService'),
      value: UserAttribute.OverseasCustomerService,
    },
    {
      label: $t('system.user.userAttributeOptions.hr'),
      value: UserAttribute.HR,
    },
  ];
}

/**
 * 将位标志值解析为选中的选项数组
 */
export function parseUserAttribute(value: number | undefined): number[] {
  if (!value) return [];
  return userAttributeValues.filter((bit) => (value & bit) === bit);
}

/**
 * 将选中的选项数组合并为位标志值
 */
export function combineUserAttribute(selected: number[]): number {
  return selected.reduce((acc, bit) => acc | bit, 0);
}

/**
 * 将位标志值格式化为可读文本
 */
export function formatUserAttribute(value: number | undefined): string {
  const selected = parseUserAttribute(value);
  if (!selected.length) return '-';

  const optionMap = new Map(
    getUserAttributeOptions().map((item) => [item.value, item.label]),
  );
  return selected
    .map((bit) => optionMap.get(bit))
    .filter(Boolean)
    .join(', ');
}

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

/** 性别选项 */
export function getGenderOptions() {
  return [
    { label: $t('system.user.genderMale'), value: 1 },
    { label: $t('system.user.genderFemale'), value: 2 },
  ];
}

/** 是否选项 */
export const booleanOptions = [
  { label: () => $t('common.yes'), value: true },
  { label: () => $t('common.no'), value: false },
];

/**
 * 用户表单 Schema（分区布局）
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    // ===== 隐藏字段 =====
    {
      component: 'Input',
      fieldName: 'id',
      label: 'ID',
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
      rules: z.string().min(2, {
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
      rules: z.string().min(1, {
        message: $t('ui.formRules.required', [$t('system.user.nickName')]),
      }),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
      },
      fieldName: 'enName',
      label: $t('system.user.enName'),
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
        show: (values) => !values.id,
      },
      fieldName: 'password',
      label: $t('system.user.password'),
      help: $t('system.user.passwordHelp'),
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
        disabled: true,
        placeholder: '待后端接口支持',
      },
      fieldName: 'officeTel',
      label: $t('system.user.officeTel'),
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
          return z.string().optional();
        },
      },
      fieldName: 'emailAddress',
      label: $t('system.user.email'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
      },
      fieldName: 'qq',
      label: $t('system.user.qq'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 32,
        showCount: true,
      },
      fieldName: 'employeeID',
      label: $t('system.user.employeeID'),
    },
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
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: getGenderOptions(),
        placeholder: $t('system.user.gender'),
      },
      fieldName: 'gender',
      label: $t('system.user.gender'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('system.user.isActiveOn'), value: true },
          { label: $t('system.user.isActiveOff'), value: false },
        ],
        optionType: 'button',
      },
      defaultValue: true,
      fieldName: 'isActive',
      label: $t('system.user.isActiveLabel'),
      dependencies: {
        triggerFields: ['isActive'],
        componentProps: (values, _formApi) => {
          return {
            onChange: (e: any) => {
              const newVal = e?.target?.value ?? e;
              if (newVal === false) {
                _formApi.setValues({ enable: false });
              }
            },
          };
        },
      },
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('system.user.enableOn'), value: true },
          { label: $t('system.user.enableOff'), value: false },
        ],
        optionType: 'button',
      },
      defaultValue: true,
      fieldName: 'enable',
      label: $t('system.user.enable'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 20,
        showCount: true,
      },
      fieldName: 'idNumber',
      label: $t('system.user.idNumber'),
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
    {
      component: 'CheckboxGroup',
      componentProps: {
        options: getUserAttributeOptions(),
      },
      fieldName: 'userAttributeFlags',
      label: $t('system.user.userAttribute'),
    },

    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        disabled: true,
        placeholder: '待后端接口支持',
      },
      fieldName: 'senderDisplayName',
      label: $t('system.user.senderDisplayName'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
        type: 'password',
        autocomplete: 'off',
      },
      fieldName: 'emailPwd',
      label: $t('system.user.emailPwd'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
        placeholder: 'imap.example.com:993',
      },
      fieldName: 'receiveAddrPort',
      label: $t('system.user.receiveAddrPort'),
    },
    {
      component: 'Input',
      componentProps: {
        maxlength: 64,
        showCount: true,
        placeholder: 'smtp.example.com:465',
      },
      fieldName: 'sendAddrPort',
      label: $t('system.user.sendAddrPort'),
    },

    {
      component: 'Textarea',
      componentProps: {
        maxlength: 1024,
        showCount: true,
        rows: 3,
      },
      fieldName: 'remark',
      label: $t('system.user.remark'),
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
    {
      component: 'Select',
      componentProps: {
        mode: 'multiple',
        allowClear: true,
        options: getUserAttributeOptions(),
        placeholder: $t('system.user.userAttribute'),
      },
      fieldName: 'UserAttributeFlags',
      label: $t('system.user.userAttribute'),
    },
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
      field: 'enName',
      title: $t('system.user.enName'),
      minWidth: 120,
    },
    {
      field: 'employeeID',
      title: $t('system.user.employeeID'),
      minWidth: 100,
    },
    {
      field: 'phoneNumber',
      title: $t('system.user.phoneNumber'),
      minWidth: 130,
    },
    {
      field: 'emailAddress',
      title: $t('system.user.email'),
      minWidth: 180,
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
    {
      field: 'userAttribute',
      title: $t('system.user.userAttribute'),
      minWidth: 140,
      formatter: ({ cellValue }) => formatUserAttribute(cellValue),
    },
    {
      field: 'isActive',
      title: $t('system.user.isActiveLabel'),
      width: 100,
      formatter: ({ cellValue }) =>
        cellValue
          ? $t('system.user.isActiveOn')
          : $t('system.user.isActiveOff'),
    },
    {
      field: 'enable',
      title: $t('system.user.enable'),
      width: 100,
      formatter: ({ cellValue }) =>
        cellValue === false
          ? $t('system.user.enableOff')
          : $t('system.user.enableOn'),
    },
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
          {
            code: 'bankAccount',
            text: $t('system.user.bankAccountAction'),
          },
          { code: 'setRoles', text: $t('system.user.setRoles') },
          { code: 'permission', text: $t('system.user.permission') },
          { code: 'changePassword', text: $t('system.user.changePassword') },
          { code: 'delete', text: $t('common.delete'), danger: true },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.user.operation'),
      width: 480,
    },
  ];
}

/**
 * 用户银行账户表单 Schema
 */
export function useUserBankAccountSchema(): VbenFormSchema[] {
  return [
    {
      component: 'CurrencySelect',
      componentProps: {
        class: 'w-full',
      },
      fieldName: 'currencyId',
      label: $t('system.user.bankAccount.currencyId'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 256 },
      fieldName: 'accountName',
      label: $t('system.user.bankAccount.accountName'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 32 },
      fieldName: 'bankShortName',
      label: $t('system.user.bankAccount.bankShortName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'bankName',
      label: $t('system.user.bankAccount.bankName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'bankAddress',
      label: $t('system.user.bankAccount.bankAddress'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'bankAccount',
      label: $t('system.user.bankAccount.bankAccount'),
      rules: 'required',
    },
  ];
}

/**
 * 用户银行账户列表列定义（Ant Design Table 用）
 */
export function useUserBankAccountColumns() {
  return [
    {
      dataIndex: 'currencyCode',
      title: $t('system.user.bankAccount.currencyId'),
      width: 80,
    },
    {
      dataIndex: 'accountName',
      title: $t('system.user.bankAccount.accountName'),
      width: 120,
    },
    {
      dataIndex: 'bankShortName',
      title: $t('system.user.bankAccount.bankShortName'),
      width: 120,
    },
    {
      dataIndex: 'bankName',
      title: $t('system.user.bankAccount.bankName'),
      width: 180,
    },
    {
      dataIndex: 'bankAccount',
      title: $t('system.user.bankAccount.bankAccount'),
      width: 200,
    },
    {
      title: $t('system.user.operation'),
      key: 'action',
      width: 140,
      fixed: 'right' as const,
    },
  ];
}
