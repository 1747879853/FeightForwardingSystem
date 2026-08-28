import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { z } from '#/adapter/form';
import { getOrganizationUnitTree } from '#/api/system/organization-unit';
import { $t } from '#/locales';

/**
 * 组织编辑表单 schema
 */
export function useSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxLength: 128,
      },
      fieldName: 'displayName',
      label: $t('system.dept.deptName'),
      rules: z
        .string()
        .min(1, $t('ui.formRules.required', [$t('system.dept.deptName')]))
        .max(
          128,
          $t('ui.formRules.maxLength', [$t('system.dept.deptName'), 128]),
        ),
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
      fieldName: 'parentId',
      label: $t('system.dept.parentDept'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('system.dept.isCompanyYes'), value: true },
          { label: $t('system.dept.isCompanyNo'), value: false },
        ],
        optionType: 'button',
      },
      defaultValue: false,
      fieldName: 'isCompany',
      label: $t('system.dept.orgType'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 64 },
      fieldName: 'shortName',
      label: $t('system.dept.shortName'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 64 },
      fieldName: 'enName',
      label: $t('system.dept.enName'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 64 },
      fieldName: 'contactPhone',
      label: $t('system.dept.contactPhone'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 64 },
      fieldName: 'email',
      label: $t('system.dept.email'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 64 },
      fieldName: 'address',
      label: $t('system.dept.address'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'webUrl',
      label: $t('system.dept.webUrl'),
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'enable',
      label: $t('system.dept.enable'),
    },
    // === 以下为公司专属字段，仅 isCompany=true 时显示 ===
    {
      component: 'Input',
      componentProps: {
        maxLength: 128,
        placeholder: $t('system.dept.unifiedSocialCreditCodePlaceholder'),
      },
      fieldName: 'unifiedSocialCreditCode',
      label: $t('system.dept.unifiedSocialCreditCode'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
        required: (values) => values.isCompany === true,
        rules: (values) => {
          if (values.isCompany === true) {
            const message = $t(
              'system.dept.unifiedSocialCreditCodePlaceholder',
            );
            return z.string({ required_error: message }).min(1, { message });
          }
          return z.string().optional();
        },
      },
    },
    {
      component: 'CurrencySelect',
      componentProps: {
        class: 'w-full',
      },
      fieldName: 'localCurrencyId',
      label: $t('system.dept.localCurrency'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
        rules: (values) => {
          if (values.isCompany === true) {
            return 'selectRequired';
          }
          return z.any().optional();
        },
      },
    },
    {
      component: 'Input',
      componentProps: { maxLength: 256 },
      fieldName: 'invoiceAddress',
      label: $t('system.dept.invoiceAddress'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
      },
    },
    {
      component: 'Input',
      componentProps: { maxLength: 64 },
      fieldName: 'invoiceTel',
      label: $t('system.dept.invoiceTel'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
      },
    },
    {
      component: 'Input',
      componentProps: {
        maxLength: 128,
        placeholder: $t('system.dept.invoiceAppKeyPlaceholder'),
      },
      fieldName: 'invoiceAppKey',
      label: $t('system.dept.invoiceAppKey'),
      help: $t('system.dept.invoiceAppKeyHelp'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
      },
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        maxLength: 128,
        placeholder: $t('system.dept.invoiceAppSecretPlaceholder'),
      },
      fieldName: 'invoiceAppSecret',
      label: $t('system.dept.invoiceAppSecret'),
      help: $t('system.dept.invoiceAppSecretHelp'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
      },
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        maxLength: 512,
        placeholder: $t('system.dept.invoiceAccessTokenPlaceholder'),
      },
      fieldName: 'invoiceAccessToken',
      label: $t('system.dept.invoiceAccessToken'),
      help: $t('system.dept.invoiceAccessTokenHelp'),
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
      },
    },
    {
      component: 'FileUploadInput',
      fieldName: 'logo',
      label: $t('system.dept.logo'),
      help: $t('system.dept.logoHelp'),
      componentProps: {
        allowedTypes: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
        listType: 'picture-card',
        maxCount: 1,
        maxSizeMB: 5,
      },
      dependencies: {
        triggerFields: ['isCompany'],
        show: (values) => values.isCompany === true,
      },
    },
  ];
}

/**
 * 银行账户编辑表单 schema
 */
export function useBankAccountSchema(): VbenFormSchema[] {
  return [
    {
      component: 'CurrencySelect',
      componentProps: {
        class: 'w-full',
      },
      fieldName: 'currencyId',
      label: $t('system.dept.bankAccount.currencyId'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 256 },
      fieldName: 'accountName',
      label: $t('system.dept.bankAccount.accountName'),
      help: $t('system.dept.bankAccount.accountNameHelp'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 32 },
      fieldName: 'bankShortName',
      label: $t('system.dept.bankAccount.bankShortName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'bankName',
      label: $t('system.dept.bankAccount.bankName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'bankAddress',
      label: $t('system.dept.bankAccount.bankAddress'),
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'bankAccount',
      label: $t('system.dept.bankAccount.bankAccount'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxLength: 128 },
      fieldName: 'swiftCode',
      label: $t('system.dept.bankAccount.swiftCode'),
      help: $t('system.dept.bankAccount.swiftCodeHelp'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('common.yes'), value: true },
          { label: $t('common.no'), value: false },
        ],
        optionType: 'button',
      },
      defaultValue: false,
      fieldName: 'default',
      label: $t('system.dept.bankAccount.default'),
      rules: 'selectRequired',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('common.enabled'), value: true },
          { label: $t('common.disabled'), value: false },
        ],
        optionType: 'button',
      },
      defaultValue: true,
      fieldName: 'enable',
      label: $t('system.dept.bankAccount.enable'),
      rules: 'selectRequired',
    },
    {
      component: 'Textarea',
      componentProps: { maxLength: 1024, rows: 3 },
      fieldName: 'remark',
      label: $t('system.dept.bankAccount.remark'),
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<SystemOrganizationUnitApi.OrganizationUnitTreeDto>,
): VxeTableGridOptions<SystemOrganizationUnitApi.OrganizationUnitTreeDto>['columns'] {
  return [
    {
      align: 'left',
      field: 'displayName',
      fixed: 'left',
      title: $t('system.dept.deptName'),
      treeNode: true,
    },
    {
      field: 'code',
      title: $t('system.dept.code'),
    },

    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'displayName',
          nameTitle: $t('system.dept.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'append',
            text: $t('system.dept.addChild'),
          },
          'edit',
          {
            code: 'delete',
            disabled: (
              row: SystemOrganizationUnitApi.OrganizationUnitTreeDto,
            ) => {
              return !!(row.children && row.children.length > 0);
            },
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('system.dept.operation'),
    },
  ];
}
