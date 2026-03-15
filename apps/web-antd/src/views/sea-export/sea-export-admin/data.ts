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
      field: 'etd',
      title: $t('seaExport.export.etd'),
      minWidth: 140,
      formatter: 'formatDateTime',
    },
    {
      field: 'eta',
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
      component: 'Switch',
      fieldName: 'isBusinessLocking',
      label: $t('seaExport.export.isBusinessLocking'),
      defaultValue: false,
      componentProps: { disabled: true },
    },
    {
      component: 'Switch',
      fieldName: 'isFeeLocking',
      label: $t('seaExport.export.isFeeLocking'),
      defaultValue: false,
      componentProps: { disabled: true },
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
      component: 'Select',
      fieldName: 'noBillEnum',
      label: $t('seaExport.export.noBillEnum'),
      componentProps: {
        allowClear: true,
        options: getBillCountOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
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
      component: 'CodeServiceSelect',
      fieldName: 'codeServiceId',
      label: $t('seaExport.export.codeServiceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeIssueTypeSelect',
      fieldName: 'issueType',
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
    },
    createClientSelectSchema({
      fieldName: 'shipperId',
      industryCategory: 'b',
      label: $t('seaExport.export.shipperId'),
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
    },
    createClientSelectSchema({
      fieldName: 'consigneeId',
      industryCategory: 'e',
      label: $t('seaExport.export.consigneeId'),
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
    },
    createClientSelectSchema({
      fieldName: 'notifierId',
      industryCategory: 'h',
      label: $t('seaExport.export.notifierId'),
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
    },
    createClientSelectSchema({
      fieldName: 'secondNotifierId',
      industryCategory: 'h',
      label: $t('seaExport.export.secondNotifierId'),
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
    },
    createClientSelectSchema({
      fieldName: 'podAgentId',
      industryCategory: 's',
      label: $t('seaExport.export.podAgentId'),
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
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: $t('seaExport.export.etd'),
      componentProps: { class: 'w-full' },
    },
    {
      component: 'DatePicker',
      fieldName: 'eta',
      label: $t('seaExport.export.eta'),
      componentProps: { class: 'w-full' },
    },
    {
      component: 'DatePicker',
      fieldName: 'closingTime',
      label: $t('seaExport.export.closingTime'),
      componentProps: { class: 'w-full', showTime: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'closeVgmTime',
      label: $t('seaExport.export.closeVgmTime'),
      componentProps: { class: 'w-full', showTime: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'closeDocTime',
      label: $t('seaExport.export.closeDocTime'),
      componentProps: { class: 'w-full', showTime: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'closeManifestTime',
      label: $t('seaExport.export.closeManifestTime'),
      componentProps: { class: 'w-full', showTime: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'signingTime',
      label: $t('seaExport.export.signingTime'),
      componentProps: { class: 'w-full' },
    },
  ];
}

/**
 * 港口信息表单 schema
 * 每个港口下方紧跟备注字段（无 label），3 列布局
 */
export function usePortFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('seaExport.export.polId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: $t('seaExport.export.podId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'poT1Id',
      label: $t('seaExport.export.poT1Id'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Textarea',
      fieldName: 'polRemark',
      label: '',
      componentProps: { allowClear: true, rows: 2 },
    },
    {
      component: 'Textarea',
      fieldName: 'podRemark',
      label: '',
      componentProps: { allowClear: true, rows: 2 },
    },
    {
      component: 'Textarea',
      fieldName: 'poT1Remark',
      label: '',
      componentProps: { allowClear: true, rows: 2 },
    },
    {
      component: 'PortSelect',
      fieldName: 'poT2Id',
      label: $t('seaExport.export.poT2Id'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'receivePortId',
      label: $t('seaExport.export.receivePortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'deliverPortId',
      label: $t('seaExport.export.deliverPortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Textarea',
      fieldName: 'poT2Remark',
      label: '',
      componentProps: { allowClear: true, rows: 2 },
    },
    {
      component: 'Textarea',
      fieldName: 'receivePortRemark',
      label: '',
      componentProps: { allowClear: true, rows: 2 },
    },
    {
      component: 'Textarea',
      fieldName: 'deliverPortRemark',
      label: '',
      componentProps: { allowClear: true, rows: 2 },
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
      formItemClass: 'col-span-3',
    },
    {
      component: 'Input',
      fieldName: 'noPkgs',
      label: $t('seaExport.export.noPkgs'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'kgs',
      label: $t('seaExport.export.kgs'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'cbm',
      label: $t('seaExport.export.cbm'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Textarea',
      fieldName: 'marks',
      label: $t('seaExport.export.marks'),
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
    {
      component: 'Textarea',
      fieldName: 'goodsDes',
      label: $t('seaExport.export.goodsDes'),
      componentProps: {
        allowClear: true,
        rows: 3,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('seaExport.export.remark'),
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
      label: $t('seaExport.export.internalRemark'),
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
