import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { $t } from '#/locales';

import { createClientSelectSchema } from '../client/data';

/** 装运方式枚举：整柜=0、拼箱分票=1、拼箱主票=2 */
const getBlTypeOptions = () => [
  { value: 0, label: $t('seaExport.export.blTypeOptions.fullContainer') },
  { value: 1, label: $t('seaExport.export.blTypeOptions.lclSplit') },
  { value: 2, label: $t('seaExport.export.blTypeOptions.lclMaster') },
];

/** 订单类型枚举：直单=0、分单=1 */
const getBillTypeOptions = () => [
  { value: 0, label: $t('seaExport.export.billTypeOptions.direct') },
  { value: 1, label: $t('seaExport.export.billTypeOptions.split') },
];

/** 提单份数 / 副本份数枚举（1-10） */
const getBillCountOptions = () => [
  { value: 1, label: 'One' },
  { value: 2, label: 'Two' },
  { value: 3, label: 'Three' },
  { value: 4, label: 'Four' },
  { value: 5, label: 'Five' },
  { value: 6, label: 'Six' },
  { value: 7, label: 'Seven' },
  { value: 8, label: 'Eight' },
  { value: 9, label: 'Nine' },
  { value: 10, label: 'Ten' },
];

/** 签单方式枚举 */
const getIssueTypeOptions = () => [
  { value: 0, label: $t('seaExport.export.issueTypeOptions.booking') },
  { value: 1, label: $t('seaExport.export.issueTypeOptions.truck') },
  { value: 2, label: $t('seaExport.export.issueTypeOptions.customs') },
  { value: 3, label: $t('seaExport.export.issueTypeOptions.warehouse') },
  { value: 4, label: $t('seaExport.export.issueTypeOptions.insurance') },
  { value: 5, label: $t('seaExport.export.issueTypeOptions.agency') },
];

/** 货物类型枚举 */
const getCargoTypeOptions = () => [
  { value: 0, label: $t('seaExport.export.cargoTypeOptions.normal') },
  { value: 1, label: $t('seaExport.export.cargoTypeOptions.refrigerated') },
  { value: 2, label: $t('seaExport.export.cargoTypeOptions.dangerous') },
  { value: 3, label: $t('seaExport.export.cargoTypeOptions.outOfGauge') },
];

/** 贸易条款枚举 */
const getTradeTermsTypeOptions = () => [
  { value: 0, label: $t('seaExport.export.tradeTermsTypeOptions.cif') },
  { value: 1, label: $t('seaExport.export.tradeTermsTypeOptions.fob') },
  { value: 2, label: $t('seaExport.export.tradeTermsTypeOptions.exw') },
  { value: 3, label: $t('seaExport.export.tradeTermsTypeOptions.fca') },
  { value: 4, label: $t('seaExport.export.tradeTermsTypeOptions.ddp') },
  { value: 5, label: $t('seaExport.export.tradeTermsTypeOptions.ddu') },
  { value: 6, label: $t('seaExport.export.tradeTermsTypeOptions.dap') },
  { value: 7, label: $t('seaExport.export.tradeTermsTypeOptions.cAndF') },
];

/**
 * 列表搜索表单 schema
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
  ];
}

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */
export function useColumns(): VxeTableGridOptions<SeaExportAdminApi.SeaExportDto>['columns'] {
  return [
    { type: 'radio', width: 48, fixed: 'left' },
    {
      field: 'transportOrder.commissionNum',
      title: $t('seaExport.export.commissionNum'),
      minWidth: 140,
    },
    {
      field: 'transportOrder.mblNum',
      title: $t('seaExport.export.mblNum'),
      minWidth: 140,
    },
    {
      field: 'transportOrder.bookingNum',
      title: $t('seaExport.export.bookingNum'),
      minWidth: 130,
    },
    {
      field: 'billType',
      title: $t('seaExport.export.billType'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: getBillTypeOptions(),
      },
    },
    {
      field: 'blType',
      title: $t('seaExport.export.blType'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: getBlTypeOptions(),
      },
    },
    {
      field: 'vessel',
      title: $t('seaExport.export.vessel'),
      minWidth: 120,
    },
    {
      field: 'innerVoyno',
      title: $t('seaExport.export.innerVoyno'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.etd',
      title: $t('seaExport.export.etd'),
      minWidth: 140,
      formatter: 'formatDateTime',
    },
    {
      field: 'transportOrder.eta',
      title: $t('seaExport.export.eta'),
      minWidth: 140,
      formatter: 'formatDateTime',
    },
    {
      field: 'remark',
      title: $t('seaExport.export.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('seaExport.export.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}

/**
 * 基础信息表单 schema（顶部）
 */
export function useBasicInfoFormSchema(isEdit = false): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'commissionNum',
      label: $t('seaExport.export.commissionNum'),
      componentProps: {
        disabled: true,
        placeholder: isEdit
          ? ''
          : $t('seaExport.export.commissionNumAutoGenerate'),
      },
    },
    {
      component: 'Input',
      fieldName: 'countryName',
      label: $t('seaExport.export.countryName'),
      componentProps: { disabled: true, placeholder: '自动关联' },
    },
    {
      component: 'Input',
      fieldName: 'laneName',
      label: $t('seaExport.export.laneName'),
      componentProps: { disabled: true, placeholder: '自动关联' },
    },
    {
      component: 'DatePicker',
      fieldName: 'accountDate',
      label: $t('seaExport.export.accountDate'),
      componentProps: {
        class: 'w-full',
        picker: 'month',
        disabled: true,
        placeholder: isEdit
          ? undefined
          : $t('seaExport.export.commissionNumAutoGenerate'),
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'settlementDate',
      label: $t('seaExport.export.settlementDate'),
      componentProps: {
        class: 'w-full',
        disabled: true,
        placeholder: isEdit
          ? undefined
          : $t('seaExport.export.commissionNumAutoGenerate'),
      },
    },

    {
      component: 'Select',
      fieldName: 'blType',
      label: $t('seaExport.export.blType'),
      defaultValue: 0,
      componentProps: {
        allowClear: true,
        options: getBlTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'billType',
      label: $t('seaExport.export.billType'),
      defaultValue: 0,
      componentProps: {
        allowClear: true,
        options: getBillTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'BillCountsInput',
      fieldName: 'noBillEnum',
      label: '提单/副本份数',
      componentProps: (values: Record<string, any>, formApi: any) => ({
        options: getBillCountOptions(),
        formContext: formApi,
        secondFieldName: 'copyNoBillEnum',
        secondFieldValue: values?.copyNoBillEnum ?? undefined,
      }),
    },
    {
      component: 'Select',
      fieldName: 'copyNoBillEnum',
      label: $t('seaExport.export.copyNoBillEnum'),
      componentProps: {
        allowClear: true,
        options: getBillCountOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
      formItemClass: 'hidden',
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceId',
      label: $t('seaExport.export.codeSourceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeFrtSelect',
      fieldName: 'codeFrtId',
      label: $t('seaExport.export.codeFrtId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'prepareAtId',
      label: $t('seaExport.export.prepareAtId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeServiceSelect',
      fieldName: 'codeServiceId',
      label: $t('seaExport.export.codeServiceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'tradeTermsType',
      label: $t('seaExport.export.tradeTermsType'),
      componentProps: {
        allowClear: true,
        options: getTradeTermsTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'cargoId',
      label: '',
      hideLabel: true,
      formItemClass: 'cargo-type-inline-item',
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        placeholder: '请选择货物类型',
        class: 'w-full',
      },
    },
    {
      component: 'CodeIssueTypeSelect',
      fieldName: 'codeIssueTypeId',
      label: $t('seaExport.export.issueType'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'mblNum',
      label: $t('seaExport.export.mblNum'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'bookingNum',
      label: $t('seaExport.export.bookingNum'),
      componentProps: { allowClear: true },
    },
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: $t('seaExport.export.clientId'),
      rules: 'selectRequired',
    }),
    createClientSelectSchema({
      fieldName: 'teamId',
      industryCategory: 'i',
      label: $t('seaExport.export.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'custBrokerId',
      industryCategory: 'f',
      label: $t('seaExport.export.custBrokerId'),
    }),
    createClientSelectSchema({
      fieldName: 'warehouseId',
      industryCategory: 'q',
      label: $t('seaExport.export.warehouseId'),
    }),
    createClientSelectSchema({
      fieldName: 'insuranceId',
      industryCategory: 'r',
      label: $t('seaExport.export.insuranceId'),
    }),
  ];
}

/**
 * 相关方信息表单 schema（发货人、收货人、通知人、第二通知人、目的港代理及其内容）
 */
export function usePartyInfoFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'OrderUsersButton',
      fieldName: 'orderUsers',
      label: $t('seaExport.export.orderUsers'),
      formItemClass: 'party-flow-order-users',
    },
    createClientSelectSchema({
      fieldName: 'shipperId',
      industryCategory: 'b',
      label: $t('seaExport.export.shipperId'),
      formItemClass: 'party-flow-item party-flow-pos--1',
    }),
    {
      component: 'Textarea',
      fieldName: 'shipperContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass: 'party-flow-content party-flow-content-pos--1',
    },
    createClientSelectSchema({
      fieldName: 'consigneeId',
      industryCategory: 'e',
      label: $t('seaExport.export.consigneeId'),
      formItemClass: 'party-flow-item party-flow-pos--2',
    }),
    {
      component: 'Textarea',
      fieldName: 'consigneeContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass: 'party-flow-content party-flow-content-pos--2',
    },
    createClientSelectSchema({
      fieldName: 'notifierId',
      industryCategory: 'h',
      label: $t('seaExport.export.notifierId'),
      formItemClass:
        'party-flow-item party-flow-item--notifier party-flow-pos--3',
    }),
    {
      component: 'Textarea',
      fieldName: 'notifierContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass:
        'party-flow-content party-flow-content--notifier party-flow-content-pos--3',
    },
    createClientSelectSchema({
      fieldName: 'secondNotifierId',
      industryCategory: 'h',
      label: $t('seaExport.export.secondNotifierId'),
      formItemClass:
        'party-flow-item party-flow-item--notifier party-flow-item--notifier-secondary party-flow-pos--3 party-flow-item--hidden',
    }),
    {
      component: 'Textarea',
      fieldName: 'secondNotifierContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass:
        'party-flow-content party-flow-content--notifier party-flow-content--notifier-secondary party-flow-content-pos--3 party-flow-item--hidden',
    },
    createClientSelectSchema({
      fieldName: 'podAgentId',
      industryCategory: 's',
      label: $t('seaExport.export.overseasAgent'),
      formItemClass:
        'party-flow-item party-flow-item--notifier party-flow-item--notifier-pod-agent party-flow-pos--3 party-flow-item--hidden',
    }),
    {
      component: 'Textarea',
      fieldName: 'podAgentContent',
      label: '',
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass:
        'party-flow-content party-flow-content--notifier party-flow-content--notifier-pod-agent party-flow-content-pos--3 party-flow-item--hidden',
    },
  ];
}

/**
 * 港口与货物信息表单 schema（合并：港口信息 + 货物信息）
 * 注意：箱型由 OrderCtnTable 组件单独渲染，放在「箱型与货物」Card 中
 */
export function usePortCargoFormSchema(): VbenFormSchema[] {
  return [...usePortFormSchema(), ...useCargoFormSchema()];
}

/**
 * 船期信息表单 schema（保留供单独使用）
 */
export function useShipmentFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'VesselVoyageInput',
      fieldName: 'vessel',
      label: $t('seaExport.export.vesselVoyage'),
      componentProps: (values: Record<string, any>, formApi: any) => ({
        formContext: formApi,
        secondFieldName: 'innerVoyno',
        secondFieldValue: values?.innerVoyno ?? '',
      }),
    },
    {
      component: 'Input',
      fieldName: 'innerVoyno',
      label: '',
      formItemClass: 'hidden',
      componentProps: { class: 'hidden' },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: $t('seaExport.export.carrierId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    createClientSelectSchema({
      fieldName: 'bookingAgentId',
      industryCategory: 'o',
      label: $t('seaExport.export.bookingAgentId'),
    }),
    createClientSelectSchema({
      fieldName: 'shipAgentId',
      industryCategory: 'n',
      label: $t('seaExport.export.shipAgentId'),
    }),
    createClientSelectSchema({
      fieldName: 'yardId',
      industryCategory: 'c',
      label: $t('seaExport.export.yardId'),
    }),
    {
      component: 'DatePicker',
      fieldName: 'goodsCompleteTime',
      label: $t('seaExport.export.goodsCompleteTime'),
      componentProps: { class: 'w-full' },
      formItemClass: 'shipment-time-item shipment-time-pos--1',
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: $t('seaExport.export.etd'),
      componentProps: { class: 'w-full' },
      formItemClass: 'shipment-time-item shipment-time-pos--2',
    },
    {
      component: 'DatePicker',
      fieldName: 'eta',
      label: $t('seaExport.export.eta'),
      componentProps: { class: 'w-full' },
      formItemClass: 'shipment-time-item shipment-time-pos--3',
    },
    {
      component: 'DatePicker',
      fieldName: 'closingTime',
      label: $t('seaExport.export.closingTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass: 'shipment-time-item shipment-time-pos--4 hidden',
    },
    {
      component: 'DatePicker',
      fieldName: 'closeVgmTime',
      label: $t('seaExport.export.closeVgmTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass: 'shipment-time-item shipment-time-pos--4',
    },
    {
      component: 'DatePicker',
      fieldName: 'closeDocTime',
      label: $t('seaExport.export.closeDocTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass: 'shipment-time-item shipment-time-pos--5',
    },
    {
      component: 'DatePicker',
      fieldName: 'closeManifestTime',
      label: $t('seaExport.export.closeManifestTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass:
        'shipment-time-item shipment-time-item--last shipment-time-pos--6',
    },
    {
      component: 'PortSelect',
      fieldName: 'signingPortId',
      label: $t('seaExport.export.signingPortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'signingTime',
      label: $t('seaExport.export.signingTime'),
      componentProps: {
        class: 'w-full',
      },
    },
  ];
}

/**
 * 服务项目表单 schema（从基础信息/船期中抽离）
 */
export function useServiceItemFormSchema(): VbenFormSchema[] {
  const serviceItems = [
    {
      fieldName: 'bookingAgentId',
      enableFieldName: 'bookingAgentIdEnabled',
      industryCategory: 'o',
      label: '订舱代理',
    },
    {
      fieldName: 'teamId',
      enableFieldName: 'teamIdEnabled',
      industryCategory: 'i',
      label: '车队',
    },
    {
      fieldName: 'custBrokerId',
      enableFieldName: 'custBrokerIdEnabled',
      industryCategory: 'f',
      label: '报关行',
    },
    {
      fieldName: 'warehouseId',
      enableFieldName: 'warehouseIdEnabled',
      industryCategory: 'q',
      label: '仓库',
    },
    {
      fieldName: 'insuranceId',
      enableFieldName: 'insuranceIdEnabled',
      industryCategory: 'r',
      label: '保险公司',
    },
  ] as const;

  return serviceItems.flatMap((item, index) => {
    const colClass = `service-item-col--${index + 1}`;
    return [
      {
        component: 'Input',
        fieldName: item.enableFieldName,
        hideLabel: true,
        defaultValue: false,
        formItemClass: 'hidden',
      },
      {
        component: 'ServiceItemInput',
        fieldName: item.fieldName,
        hideLabel: true,
        defaultValue: undefined,
        componentProps: (values: Record<string, any>, formApi: any) => ({
          title: item.label,
          industryCategory: item.industryCategory,
          formContext: formApi,
          secondFieldName: item.enableFieldName,
          secondFieldValue: values?.[item.enableFieldName] ?? false,
        }),
        formItemClass: `service-item-card ${colClass}`,
      },
    ];
  });
}

/**
 * 港口信息表单 schema
 * 货物流转节点按顺序展示：收货地 -> 起运港 -> 中转港（Tab切换1/2） -> 目的港 -> 交货地
 */
export function usePortFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'PortSelect',
      fieldName: 'receivePortId',
      label: $t('seaExport.export.receivePortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass: 'port-flow-item port-flow-pos--receive',
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('seaExport.export.polId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass: 'port-flow-item port-flow-pos--pol',
    },
    {
      component: 'PortSelect',
      fieldName: 'poT1Id',
      label: $t('seaExport.export.poT1Id'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass:
        'port-flow-item port-flow-item--transit port-flow-pos--transit',
    },
    {
      component: 'PortSelect',
      fieldName: 'poT2Id',
      label: $t('seaExport.export.poT2Id'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass:
        'port-flow-item port-flow-item--transit port-flow-item--transit-secondary port-flow-pos--transit',
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: $t('seaExport.export.podId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass: 'port-flow-item port-flow-pos--pod',
    },
    {
      component: 'PortSelect',
      fieldName: 'deliverPortId',
      label: $t('seaExport.export.deliverPortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass:
        'port-flow-item port-flow-item--last port-flow-pos--deliver',
    },
    {
      component: 'Textarea',
      fieldName: 'receivePortRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--receive-remark',
    },
    {
      component: 'Textarea',
      fieldName: 'polRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--pol-remark',
    },
    {
      component: 'Textarea',
      fieldName: 'poT1Remark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass:
        'port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark',
    },
    {
      component: 'Textarea',
      fieldName: 'poT2Remark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass:
        'port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark',
    },
    {
      component: 'Textarea',
      fieldName: 'podRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--pod-remark',
    },
    {
      component: 'Textarea',
      fieldName: 'deliverPortRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--deliver-remark',
    },
    {
      component: 'PortSelect',
      fieldName: 'signingPortId',
      label: $t('seaExport.export.signingPortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass: 'hidden',
    },
  ];
}

/**
 * 货物信息表单 schema
 */
export function useCargoFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'OrderGoodsButton',
      fieldName: 'orderCodeGoodss',
      label: $t('seaExport.export.orderCodeGoodss'),
      formItemClass: 'col-span-2',
    },
    {
      component: 'Textarea',
      fieldName: 'marks',
      label: $t('seaExport.export.marks'),
      componentProps: {
        allowClear: true,
        rows: 8,
        style: { minHeight: '248px' },
      },
      formItemClass: 'col-span-3 cargo-main-item cargo-main-item--marks',
    },
    {
      component: 'Textarea',
      fieldName: 'goodsDes',
      label: $t('seaExport.export.goodsDes'),
      componentProps: {
        allowClear: true,
        rows: 8,
        style: { minHeight: '248px' },
      },
      formItemClass: 'col-span-3 cargo-main-item cargo-main-item--goods-des',
    },
    {
      component: 'InputNumber',
      fieldName: 'pkgs',
      label: $t('seaExport.export.pkgs'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 0,
      },
      formItemClass: 'cargo-main-item cargo-main-item--pkgs',
    },
    {
      component: 'CodePackageSelect',
      fieldName: 'codePackageId',
      label: $t('seaExport.export.codePackageId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
      formItemClass: 'cargo-main-item cargo-main-item--code-package',
    },
    {
      component: 'InputNumber',
      fieldName: 'kgs',
      label: $t('seaExport.export.kgs'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 2,
      },
      formItemClass: 'cargo-main-item cargo-main-item--kgs',
    },
    {
      component: 'InputNumber',
      fieldName: 'cbm',
      label: $t('seaExport.export.cbm'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 2,
      },
      formItemClass: 'cargo-main-item cargo-main-item--cbm',
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: {
        allowClear: true,
        rows: 3,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
    {
      component: 'Textarea',
      fieldName: 'internalRemark',
      label: `${$t('seaExport.export.internalRemark')}(仅内部可见)`,
      componentProps: {
        allowClear: true,
        rows: 3,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
  ];
}

export { getBlTypeOptions, getBillTypeOptions, getIssueTypeOptions };
