import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { $t } from '#/locales';
import form from 'ant-design-vue/es/form';

import { useVbenForm, z } from '#/adapter/form';
import {
  getMyPermissionCompanies,
  type SystemOrganizationUnitApi,
} from '#/api/system/organization-unit';
import { UserAttribute } from '#/api/system/user-admin';
import type { BillingPeriodAdminApi } from '#/api/sea-export/billing-period-admin';

/**
 * 业务类型枚举
 */
export const BusinessTypeOptions = [
  {
    value: 0,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.seaExport'),
  },
  {
    value: 1,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.seaImport'),
  },
];

/**
 * 结算方式枚举选项
 */
export const SettlementTypeOptions = [
  {
    value: 0,
    label: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.ticketSettlement',
    ),
    color: '#1890ff', // 蓝色 - 票结
  },
  {
    value: 1,
    label: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.monthlySettlement',
    ),
    color: '#52c41a', // 绿色 - 月结
  },
  {
    value: 2,
    label: $t(
      'seaExport.client.paymentTerms.SettlementTypeOptions.appointedDaySettlement',
    ),
    color: '#fa8c16', // 橙色 - 指定日结
  },
];

/**
 * 日期类型枚举选项
 */
export const DateTypeOptions = [
  {
    value: 0,
    label: $t('seaExport.client.paymentTerms.DateTypeOptions.shippingDate'),
  },
];

/**
 * 间隔月份枚举选项
 */
export const MonthsOptions = [
  { value: 1, label: $t('seaExport.client.paymentTerms.monthsOptions.1') },
  { value: 2, label: $t('seaExport.client.paymentTerms.monthsOptions.2') },
  { value: 3, label: $t('seaExport.client.paymentTerms.monthsOptions.3') },
  { value: 4, label: $t('seaExport.client.paymentTerms.monthsOptions.4') },
  { value: 5, label: $t('seaExport.client.paymentTerms.monthsOptions.5') },
  { value: 6, label: $t('seaExport.client.paymentTerms.monthsOptions.6') },
  { value: 7, label: $t('seaExport.client.paymentTerms.monthsOptions.7') },
  { value: 8, label: $t('seaExport.client.paymentTerms.monthsOptions.8') },
  { value: 9, label: $t('seaExport.client.paymentTerms.monthsOptions.9') },
  { value: 10, label: $t('seaExport.client.paymentTerms.monthsOptions.10') },
  { value: 11, label: $t('seaExport.client.paymentTerms.monthsOptions.11') },
  { value: 12, label: $t('seaExport.client.paymentTerms.monthsOptions.12') },
];

/**结算日枚举选项 */
export const SettlementDayOptions = [
  {
    value: 1,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.1'),
  },
  {
    value: 2,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.2'),
  },
  {
    value: 3,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.3'),
  },
  {
    value: 4,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.4'),
  },
  {
    value: 5,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.5'),
  },
  {
    value: 6,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.6'),
  },
  {
    value: 7,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.7'),
  },
  {
    value: 8,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.8'),
  },
  {
    value: 9,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.9'),
  },
  {
    value: 10,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.10'),
  },
  {
    value: 11,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.11'),
  },
  {
    value: 12,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.12'),
  },
  {
    value: 13,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.13'),
  },
  {
    value: 14,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.14'),
  },
  {
    value: 15,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.15'),
  },
  {
    value: 16,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.16'),
  },
  {
    value: 17,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.17'),
  },
  {
    value: 18,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.18'),
  },
  {
    value: 19,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.19'),
  },
  {
    value: 20,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.20'),
  },
  {
    value: 21,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.21'),
  },
  {
    value: 22,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.22'),
  },
  {
    value: 23,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.23'),
  },
  {
    value: 24,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.24'),
  },
  {
    value: 25,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.25'),
  },
  {
    value: 26,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.26'),
  },
  {
    value: 27,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.27'),
  },
  {
    value: 28,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.28'),
  },
  {
    value: 29,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.29'),
  },
  {
    value: 30,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.30'),
  },
  {
    value: 31,
    label: $t('seaExport.client.paymentTerms.settlementDayOptions.31'),
  },
];

/** 账期规则可选用户属性：仅销售 */
const PAYMENT_TERMS_USER_ATTRIBUTE_MASK = UserAttribute.Sales;

/**
 * 新增/编辑客户账单 schema
 */
export function useBillFormSchema(): VbenFormSchema[] {
  return [
    // 第一行：合同号、日期类型、生效时间、失效时间、长期有效
    {
      component: 'Input',
      fieldName: 'contractNo',
      label: $t('seaExport.client.paymentTerms.contractNo'),
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        class: 'w-full',
        maxlength: 64,
      },
    },
    {
      component: 'Select',
      fieldName: 'dateType',
      label: $t('seaExport.client.paymentTerms.dateType'),
      defaultValue: 0,
      formItemClass: 'col-span-1',
      rules: z
        .number()
        .min(
          0,
          $t('ui.formRules.required', [
            $t('seaExport.client.paymentTerms.dateType'),
          ]),
        ),
      componentProps: {
        allowClear: false,
        options: DateTypeOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'effectiveTime',
      label: $t('seaExport.client.paymentTerms.effectiveTime'),
      formItemClass: 'col-span-1',
      componentProps: { class: 'w-full' },
    },
    {
      component: 'DatePicker',
      fieldName: 'expiringTime',
      label: $t('seaExport.client.paymentTerms.expirationTime'),
      formItemClass: 'col-span-1',
      componentProps: {
        class: 'w-full',
        disabled: false, // 默认不禁用，根据需要调整
      },
    },
    {
      component: 'Switch',
      fieldName: 'permanent',
      label: $t('seaExport.client.paymentTerms.longTermValid'),
      defaultValue: false,
      formItemClass: 'col-span-1',
    },
    // 第二行：组织机构 、用户、业务类型
    {
      component: 'ApiTreeSelect',
      fieldName: 'organizationUnitIds',
      label: $t('seaExport.client.paymentTerms.orgs'),
      formItemClass: 'col-span-2',
      componentProps: {
        api: async () => {
          // 调用接口获取有权限的公司列表
          const companies = await getMyPermissionCompanies();
          // 转换为树形选择器需要的格式（虽然是扁平列表，但ApiTreeSelect也能处理）
          return companies.map(
            (company: SystemOrganizationUnitApi.OrganizationUnitSimpleDto) => ({
              id: company.id,
              displayName: company.name,
              children: [],
            }),
          );
        },
        // 字段映射配置
        fieldNames: {
          label: 'displayName',
          value: 'id',
          children: 'children',
        },
        multiple: true,
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        treeCheckable: false, // 禁用树形勾选，作为普通多选下拉使用
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'userIds',
      label: $t('seaExport.client.paymentTerms.user'),
      formItemClass: 'col-span-2',
      componentProps: {
        userAttribute: PAYMENT_TERMS_USER_ATTRIBUTE_MASK,
        mode: 'multiple',
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        'label-key': 'nickName',
      },
    },
    {
      component: 'Select',
      fieldName: 'bizTypes',
      label: $t('seaExport.client.paymentTerms.BizType'),
      formItemClass: 'col-span-1',
      componentProps: {
        allowClear: true,
        options: BusinessTypeOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        mode: 'multiple',
      },
      defaultValue: [0],
    },
    // 第三行：业务来源 、 备注
    {
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceIds',
      label: $t('seaExport.client.paymentTerms.codeSource'),
      formItemClass: 'col-span-2',
      componentProps: {
        mode: 'multiple',
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Textarea',
      hide: false,
      fieldName: 'remark',
      label: $t('seaExport.client.paymentTerms.remark'),
      formItemClass: 'col-span-3',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        class: 'w-full',
        rows: 1,
      },
    },
    // 第四行：结算方式 、间隔月份（动态显示）、结算日（动态显示）、天数（动态显示）
    {
      component: 'Select',
      fieldName: 'settlementType',
      label: $t('seaExport.client.paymentTerms.settlementType'),
      defaultValue: 0,
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        options: SettlementTypeOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        onChange: (value: number) => {
          console.log('Selected settlement type:', value);
        },
      },
    },
    {
      component: 'Select',
      fieldName: 'months',
      label: $t('seaExport.client.paymentTerms.months'),
      hide: true,
      formItemClass: 'col-span-1',
      componentProps: {
        allowClear: true,
        options: MonthsOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'settlementDay',
      label: $t('seaExport.client.paymentTerms.settlementDay'),
      hide: true,
      formItemClass: 'col-span-1',
      componentProps: {
        allowClear: true,
        options: SettlementDayOptions,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      hide: true,
      fieldName: 'days',
      label: $t('seaExport.client.paymentTerms.days'),
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        class: 'w-full',
        min: 0,
        precision: 0,
      },
    },
    // 第五行：授信币别、授信额度、预警额度（固定在最后一行）
    {
      component: 'CurrencySelect',
      fieldName: 'creditCurrencyId',
      label: $t('seaExport.client.paymentTerms.creditCurrency'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'creditLimit',
      label: $t('seaExport.client.paymentTerms.creditLimit'),
      formItemClass: 'col-span-1',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        class: 'w-full',
        min: 0,
        precision: 2,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'warningLimit',
      label: $t('seaExport.client.paymentTerms.warningLimit'),
      formItemClass: 'col-span-2',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        class: 'w-full',
        min: 0,
        precision: 2,
      },
    },
  ];
}

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */

export function useColumns(): VxeTableGridOptions<BillingPeriodAdminApi.ClientBillingPeriodForViewDto>['columns'] {
  return [
    {
      type: 'checkbox',
      width: 50,
    },
    {
      title: $t('seaExport.client.paymentTerms.contractNo'),
      field: 'contractNo',
      width: 150,
    },
    {
      title: $t('seaExport.client.paymentTerms.dateType'),
      field: 'dateType',
      width: 120,
      cellRender: {
        name: 'CellTag',
        options: DateTypeOptions,
      },
    },
    {
      title: $t('seaExport.client.paymentTerms.creditCurrency'),
      field: 'creditCurrency',
      width: 150,
      formatter: (row) => {
        return row.row.creditCurrency?.cnName || '';
      },
    },
    {
      title: $t('seaExport.client.paymentTerms.creditLimit'),
      field: 'creditLimit',
      width: 120,
      formatter: (row) => {
        return row.row.creditLimit !== null && row.row.creditLimit !== undefined
          ? row.row.creditLimit.toFixed(2)
          : '';
      },
    },
    {
      title: $t('seaExport.client.paymentTerms.warningLimit'),
      field: 'warningLimit',
      width: 120,
      formatter: (row) => {
        return row.row.warningLimit !== null &&
          row.row.warningLimit !== undefined
          ? row.row.warningLimit.toFixed(2)
          : '';
      },
    },
    {
      title: $t('seaExport.client.paymentTerms.orgs'),
      field: 'organizationUnitName',
      width: 200,
    },
    {
      title: $t('seaExport.client.paymentTerms.BizType'),
      field: 'bizTypes',
      minWidth: 150,
      formatter: (row) => {
        console.log('row', row);
        const labels = row.row.bizTypes
          ?.map((item) => {
            return BusinessTypeOptions.find((option) => option.value === item)
              ?.label;
          })
          .filter(Boolean)
          .join(',');
        return labels || '';
      },
    },
    {
      title: $t('seaExport.client.paymentTerms.user'),
      field: 'userName',
      minWidth: 150,
    },
    {
      title: $t('seaExport.client.paymentTerms.settlementType'),
      field: 'settlementType',
      width: 150,
      cellRender: {
        name: 'CellTag',
        options: SettlementTypeOptions,
      },
    },
    {
      title: $t('seaExport.client.paymentTerms.effectiveTime'),
      field: 'effectiveTime',
      formatter: 'formatDateTime',
      width: 150,
    },
    {
      title: $t('seaExport.client.paymentTerms.expirationTime'),
      field: 'expiringTime',
      formatter: 'formatDateTime',
      width: 150,
    },
    {
      title: $t('seaExport.client.paymentTerms.period'),
      field: 'period',
      width: 150,
    },
    // {
    //   title: $t('seaExport.client.paymentTerms.invoiceEnable'),
    //   field: 'invoiceEnable',
    //   width: 150,
    //   cellRender: {
    //     name: 'CellTag',
    //     options: [
    //       { color: 'success', label: $t('common.yes'), value: true },
    //       { color: 'default', label: $t('common.no'), value: false },
    //     ],
    //   },
    // },

    {
      title: $t('auditApproval.task.createTime'),
      field: 'creationTime',
      width: 150,
      formatter: 'formatDateTime',
    },
  ];
}
