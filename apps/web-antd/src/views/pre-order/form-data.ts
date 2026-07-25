import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import {
  getCargoTypeOptions,
  getTradeTermsTypeOptions,
} from '#/views/sea-export-admin/data';

/** 干系人属性（与后端 UserAttribute 一致） */
export const USER_ATTRIBUTE = {
  Operation: 1,
  CustomerService: 2,
  Documentation: 4,
  Business: 8,
  Sale: 16,
  Finance: 32,
  OverseasCustomerService: 64,
  HR: 128,
} as const;

export const PRE_ORDER_USER_ATTRIBUTE_LABELS: {
  label: string;
  value: number;
}[] = [
  { label: '销售', value: USER_ATTRIBUTE.Sale },
  { label: '操作', value: USER_ATTRIBUTE.Operation },
  { label: '客服', value: USER_ATTRIBUTE.CustomerService },
  { label: '单证', value: USER_ATTRIBUTE.Documentation },
  { label: '商务(航线)', value: USER_ATTRIBUTE.Business },
  { label: '财务', value: USER_ATTRIBUTE.Finance },
  { label: '海外客服', value: USER_ATTRIBUTE.OverseasCustomerService },
  { label: '人事', value: USER_ATTRIBUTE.HR },
];

/** 收付类型选项 */
export const PAY_SIDE_OPTIONS = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

/**
 * 基础信息（业务/单据属性）。
 * 业务编号/状态/归属组织/装运方式对齐海运出口展示在分区标题栏 meta 区，不进表单。
 */
export function usePreOrderBasicSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ClientSelect',
      fieldName: 'clientId',
      label: '委托单位',
      rules: 'selectRequired',
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'mblNum',
      label: '主提单号',
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Select',
      fieldName: 'cargoId',
      label: '货物类型',
      defaultValue: 0,
      rules: 'selectRequired',
      componentProps: {
        options: getCargoTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'CodeServiceSelect',
      fieldName: 'codeServiceId',
      label: '运输条款',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'Select',
      fieldName: 'tradeTermsType',
      label: '贸易条款',
      componentProps: {
        allowClear: true,
        options: getTradeTermsTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'CodeFrtSelect',
      fieldName: 'codeFrtId',
      label: '付费方式',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: '开船日期',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
    {
      component: 'DatePicker',
      fieldName: 'goodsCompleteTime',
      label: '货好时间',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: { allowClear: true, class: 'w-full' },
    },
  ];
}

/** 港口与航线 */
export function usePreOrderPortSchema(): VbenFormSchema[] {
  return [
    {
      component: 'PortSelect',
      fieldName: 'receivePortId',
      label: '收货地',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: '起运港',
      rules: 'selectRequired',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'pot1Id',
      label: '中转港1',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'pot2Id',
      label: '中转港2',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: '目的港',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'deliverPortId',
      label: '交货地',
      componentProps: { allowClear: true, class: 'w-full' },
    },
  ];
}

/** 收发通 */
export function usePreOrderPartySchema(): VbenFormSchema[] {
  return [
    {
      component: 'ClientSelect',
      fieldName: 'shipperId',
      label: '发货人',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'ClientSelect',
      fieldName: 'consigneeId',
      label: '收货人',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'ClientSelect',
      fieldName: 'notifierId',
      label: '通知人',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      formItemClass: 'col-span-3',
      componentProps: { rows: 2, maxlength: 1024, showCount: true },
    },
  ];
}

/** 货物计量（箱型箱量表在编辑页同卡片下挂载） */
export function usePreOrderCargoSchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      fieldName: 'pkgs',
      label: '件数',
      componentProps: { class: 'w-full', min: 0, precision: 0 },
    },
    {
      component: 'CodePackageSelect',
      fieldName: 'codePackageId',
      label: '包装',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'InputNumber',
      fieldName: 'kgs',
      label: '毛重(KGS)',
      componentProps: { class: 'w-full', min: 0, precision: 3 },
    },
    {
      component: 'InputNumber',
      fieldName: 'cbm',
      label: '尺码(CBM)',
      componentProps: { class: 'w-full', min: 0, precision: 3 },
    },
  ];
}
