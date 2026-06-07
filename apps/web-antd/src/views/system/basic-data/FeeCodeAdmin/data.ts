import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';

import { $t } from '#/locales';

/**
 * 计费标准名称选项
 */
const getBillingUnitOptions = () => [
  { label: '箱型', value: 'ctn' },
  { label: '票', value: 'order' },
  { label: 'TEU', value: 'teu' },
];

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.feeCode.keyword'),
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
      fieldName: 'code',
      label: $t('system.basicData.feeCode.code'),
      componentProps: {
        maxLength: 50,
      },
    },
    {
      component: 'Input',
      fieldName: 'cnName',
      label: $t('system.basicData.feeCode.cnName'),
      componentProps: {
        maxLength: 100,
      },
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.feeCode.enName'),
      componentProps: {
        maxLength: 100,
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: $t('system.basicData.feeCode.defaultCurrency'),
      defaultValue: undefined,
    },
    {
      component: 'Select',
      fieldName: 'defaultUnitName',
      label: $t('system.basicData.feeCode.defaultUnitName'),
      componentProps: {
        options: getBillingUnitOptions(),
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'defaultDebitName',
      label: $t('system.basicData.feeCode.defaultDebitName'),
      componentProps: {
        options: [
          { label: '委托单位', value: 'p' },
          { label: '订舱代理', value: 'o' },
          { label: '发货人', value: 'b' },
          { label: '收货人', value: 'e' },
          { label: '通知人', value: 'h' },
          { label: '代理', value: 'k' },
          { label: '船代', value: 'n' },
          { label: '目的港代理', value: 's' },
        ],
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'defaultCreditName',
      label: $t('system.basicData.feeCode.defaultCreditName'),
      componentProps: {
        options: [
          { label: '船公司', value: 'a' },
          { label: '场站', value: 'c' },
          { label: '航空公司', value: 'd' },
          { label: '报关行', value: 'f' },
          { label: '快递公司', value: 'g' },
          { label: '车队', value: 'i' },
          { label: '仓库', value: 'q' },
          { label: '保险公司', value: 'r' },
          { label: '工厂', value: 'u' },
        ],
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'taxRate',
      label: $t('system.basicData.feeCode.taxRate'),
      componentProps: {
        min: 0,
        max: 100,
        precision: 2,
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'goodName',
      label: $t('system.basicData.feeCode.goodName'),
      componentProps: {
        maxLength: 100,
      },
    },
    {
      component: 'Input',
      fieldName: 'checkingType',
      label: $t('system.basicData.feeCode.checkingType'),
      componentProps: {
        maxLength: 50,
      },
    },
    {
      component: 'Switch',
      fieldName: 'isSea',
      label: $t('system.basicData.feeCode.isSea'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isAir',
      label: $t('system.basicData.feeCode.isAir'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isTrucking',
      label: $t('system.basicData.feeCode.isTrucking'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isTruckingFixed',
      label: $t('system.basicData.feeCode.isTruckingFixed'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isWms',
      label: $t('system.basicData.feeCode.isWms'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isAdvancedPay',
      label: $t('system.basicData.feeCode.isAdvancedPay'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isConfidential',
      label: $t('system.basicData.feeCode.isConfidential'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isInvoiceProhibit',
      label: $t('system.basicData.feeCode.isInvoiceProhibit'),
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.feeCode.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.feeCode.sortId'),
      componentProps: {
        min: 0,
        class: 'w-full',
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.feeCode.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      formItemClass: 'col-span-2',
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<FeeCodeAdminApi.FeeCodeDto>,
): VxeTableGridOptions<FeeCodeAdminApi.FeeCodeDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.feeCode.code'),
      minWidth: 100,
    },
    {
      field: 'cnName',
      title: $t('system.basicData.feeCode.cnName'),
      minWidth: 150,
    },
    {
      field: 'enName',
      title: $t('system.basicData.feeCode.enName'),
      minWidth: 150,
    },
    {
      field: 'defaultCurrency',
      title: $t('system.basicData.feeCode.defaultCurrency'),
      minWidth: 100,
    },
    {
      field: 'taxRate',
      title: $t('system.basicData.feeCode.taxRate'),
      minWidth: 80,
    },
    {
      field: 'enable',
      title: $t('system.basicData.feeCode.enable'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          {
            color: 'success',
            label: $t('common.enabled'),
            value: true,
          },
          {
            color: 'error',
            label: $t('common.disabled'),
            value: false,
          },
        ],
      },
    },
    {
      field: 'sortId',
      title: $t('system.basicData.feeCode.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.feeCode.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'cnName',
          nameTitle: $t('system.basicData.feeCode.name'),
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
