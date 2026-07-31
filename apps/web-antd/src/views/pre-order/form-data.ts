import type { VbenFormSchema } from '#/adapter/form';
import type { PortFormSchemaOptions } from '#/views/sea-export-admin/data';

import { $t } from '#/locales';
import { createClientSelectSchema } from '#/views/client/base/data';
import {
  buildPortSelectProps,
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
  ShippingLine: 256,
} as const;

/** 收付类型选项 */
export const PAY_SIDE_OPTIONS = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

/**
 * 基础信息（业务/单据属性）。
 * 业务编号/状态/归属组织/业务类型/装运方式对齐海运出口展示在分区标题栏 meta 区，不进表单。
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
      component: 'DatePicker',
      fieldName: 'goodsCompleteTime',
      label: '货好时间',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: '开船日期',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: { allowClear: true, class: 'w-full' },
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
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      formItemClass: 'col-span-4',
      componentProps: { rows: 2, maxlength: 1024, showCount: true },
    },
  ];
}

/** 港口备注字段名（与港口 id 字段一一对应，选中港口后自动回填） */
export const PRE_ORDER_PORT_REMARK_FIELDS: Record<string, string> = {
  receivePortId: 'receivePortRemark',
  polId: 'polRemark',
  pot1Id: 'pot1Remark',
  pot2Id: 'pot2Remark',
  podId: 'podRemark',
  deliverPortId: 'deliverPortRemark',
};

/**
 * 港口信息（对齐海运出口）
 * 货物流转节点按顺序展示：收货地 -> 起运港 -> 中转港（Tab 切换 1/2） -> 目的港 -> 交货地，
 * 每个节点下方带英文大写备注输入。
 */
export function usePreOrderPortSchema(
  options?: PortFormSchemaOptions,
): VbenFormSchema[] {
  const { onPortChange } = options ?? {};
  const remarkItem = (
    fieldName: string,
    formItemClass: string,
  ): VbenFormSchema => ({
    component: 'EnglishUpperTextarea',
    fieldName,
    label: '',
    componentProps: { allowClear: true, rows: 1 },
    formItemClass,
  });
  return [
    {
      component: 'PortSelect',
      fieldName: 'receivePortId',
      label: $t('seaExport.export.receivePortId'),
      componentProps: buildPortSelectProps('receivePortId', onPortChange),
      formItemClass: 'port-flow-item port-flow-pos--receive',
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('seaExport.export.polId'),
      rules: 'selectRequired',
      componentProps: buildPortSelectProps('polId', onPortChange),
      formItemClass: 'port-flow-item port-flow-pos--pol',
    },
    {
      component: 'PortSelect',
      fieldName: 'pot1Id',
      label: '',
      componentProps: buildPortSelectProps('pot1Id', onPortChange),
      formItemClass:
        'port-flow-item port-flow-item--transit port-flow-pos--transit',
    },
    {
      component: 'PortSelect',
      fieldName: 'pot2Id',
      label: '',
      componentProps: buildPortSelectProps('pot2Id', onPortChange),
      formItemClass:
        'port-flow-item port-flow-item--transit port-flow-item--transit-secondary port-flow-pos--transit',
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: $t('seaExport.export.podId'),
      componentProps: buildPortSelectProps('podId', onPortChange),
      formItemClass: 'port-flow-item port-flow-pos--pod',
    },
    {
      component: 'PortSelect',
      fieldName: 'deliverPortId',
      label: $t('seaExport.export.deliverPortId'),
      componentProps: buildPortSelectProps('deliverPortId', onPortChange),
      formItemClass:
        'port-flow-item port-flow-item--last port-flow-pos--deliver',
    },
    remarkItem(
      'receivePortRemark',
      'port-flow-remark port-flow-pos--receive-remark',
    ),
    remarkItem('polRemark', 'port-flow-remark port-flow-pos--pol-remark'),
    remarkItem(
      'pot1Remark',
      'port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark',
    ),
    remarkItem(
      'pot2Remark',
      'port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark',
    ),
    remarkItem('podRemark', 'port-flow-remark port-flow-pos--pod-remark'),
    remarkItem(
      'deliverPortRemark',
      'port-flow-remark port-flow-pos--deliver-remark',
    ),
  ];
}

/**
 * 收发通：三组对称字段（往来单位 id + 内容文本），布局对齐海运出口 party-flow。
 * 详情回填时再通过 selectedItems 注入 SimpleDto 名称。
 */
export function usePreOrderPartySchema(): VbenFormSchema[] {
  return [
    createClientSelectSchema({
      fieldName: 'shipperId',
      industryCategory: 'b',
      label: '发货人',
      formItemClass: 'party-flow-item party-flow-pos--1',
    }),
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'shipperContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        maxlength: 1024,
        showCount: true,
        style: { minHeight: '110px' },
      },
      formItemClass: 'party-flow-content party-flow-content-pos--1',
    },
    createClientSelectSchema({
      fieldName: 'consigneeId',
      industryCategory: 'e',
      label: '收货人',
      formItemClass: 'party-flow-item party-flow-pos--2',
    }),
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'consigneeContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        maxlength: 1024,
        showCount: true,
        style: { minHeight: '110px' },
      },
      formItemClass: 'party-flow-content party-flow-content-pos--2',
    },
    createClientSelectSchema({
      fieldName: 'notifierId',
      industryCategory: 'h',
      label: '通知人',
      formItemClass:
        'party-flow-item party-flow-item--notifier party-flow-pos--3',
    }),
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'notifierContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        maxlength: 1024,
        showCount: true,
        style: { minHeight: '110px' },
      },
      formItemClass:
        'party-flow-content party-flow-content--notifier party-flow-content-pos--3',
    },
  ];
}

/**
 * 货物类型 / 品名（对齐海运出口：挂在「货物与箱型」卡片标题栏内联展示）
 * 表单内品名用 number[]（codeGoodsId），提交时再映射为 preOrderCodeGoodss
 */
export function usePreOrderCargoTypeInlineSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'cargoId',
      label: '',
      hideLabel: true,
      defaultValue: 0,
      rules: 'selectRequired',
      formItemClass: 'cargo-type-inline-item cargo-type-inline-item--cargo',
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        placeholder: '请选择货物类型',
        class: 'w-full',
        size: 'small',
      },
    },
    {
      component: 'CodeGoodsSelect',
      fieldName: 'orderCodeGoodss',
      label: '',
      hideLabel: true,
      formItemClass: 'cargo-type-inline-item cargo-type-inline-item--goods',
      componentProps: {
        mode: 'multiple',
        showNameWithHsCode: true,
        placeholder: $t('seaExport.export.pleaseSelectGoods'),
        allowClear: true,
        size: 'small',
      },
    },
  ];
}

/**
 * 货物计量（件数 / 包装 / 毛重 / 尺码）。
 * 编辑页右侧垂直排列，对齐海运出口 cargo-metrics-wrap。
 */
export function usePreOrderCargoSchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      fieldName: 'pkgs',
      label: '件数',
      formItemClass: 'cargo-metrics-item cargo-metrics-item--pkgs',
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 0,
      },
    },
    {
      component: 'CodePackageSelect',
      fieldName: 'codePackageId',
      label: '包装',
      formItemClass: 'cargo-metrics-item cargo-metrics-item--code-package',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'InputNumber',
      fieldName: 'kgs',
      label: '毛重(KGS)',
      formItemClass: 'cargo-metrics-item cargo-metrics-item--kgs',
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 3,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'cbm',
      label: '尺码(CBM)',
      formItemClass: 'cargo-metrics-item cargo-metrics-item--cbm',
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 3,
      },
    },
  ];
}
