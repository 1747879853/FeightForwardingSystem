import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { $t } from '#/locales';

import { createClientSelectSchema } from '../client/data';

/** 装运方式枚举（占位数据） */
const getBlTypeOptions = () => [
  {
    value: 0,
    label: $t('seaExport.export.blTypeOptions.fullContainer'),
  },
];

/** 订单类型枚举（占位数据） */
const getBillTypeOptions = () => [
  { value: 0, label: $t('seaExport.export.billTypeOptions.m') },
  { value: 1, label: $t('seaExport.export.billTypeOptions.h') },
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
 * 左侧表单 schema（信息概览）
 */
export function useLeftFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'commissionNum',
      label: $t('seaExport.export.commissionNum'),
      componentProps: { allowClear: true, disabled: false },
      formItemClass: 'col-span-2',
    },
    {
      component: 'DatePicker',
      fieldName: 'accountDate',
      label: $t('seaExport.export.accountDate'),
      componentProps: { class: 'w-full', picker: 'month' },
      formItemClass: 'col-span-2',
    },
    {
      component: 'DatePicker',
      fieldName: 'settlementDate',
      label: $t('seaExport.export.settlementDate'),
      componentProps: { class: 'w-full' },
      formItemClass: 'col-span-2',
    },
    {
      component: 'Switch',
      fieldName: 'isBusinessLocking',
      label: $t('seaExport.export.isBusinessLocking'),
      defaultValue: false,
      formItemClass: 'col-span-1',
    },
    {
      component: 'Switch',
      fieldName: 'isFeeLocking',
      label: $t('seaExport.export.isFeeLocking'),
      defaultValue: false,
      formItemClass: 'col-span-1',
    },
    {
      component: 'Select',
      fieldName: 'blType',
      label: $t('seaExport.export.blType'),
      componentProps: {
        allowClear: true,
        options: getBlTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
      formItemClass: 'col-span-1',
    },
    {
      component: 'Select',
      fieldName: 'billType',
      label: $t('seaExport.export.billType'),
      componentProps: {
        allowClear: true,
        options: getBillTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
      formItemClass: 'col-span-1',
    },
  ];
}

/**
 * 中间表单 schema（发货人、收货人、通知人、第二通知人、目的港代理及其内容）
 */
export function useMiddleFormSchema(): VbenFormSchema[] {
  return [
    createClientSelectSchema({
      fieldName: 'shipperId',
      industryCategory: 'b',
      label: $t('seaExport.export.shipperId'),
    }),
    {
      component: 'Textarea',
      fieldName: 'shipperContent',
      label: $t('seaExport.export.shipperContent'),
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
      label: $t('seaExport.export.consigneeContent'),
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
      label: $t('seaExport.export.notifierContent'),
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
      label: $t('seaExport.export.secondNotifierContent'),
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
      label: $t('seaExport.export.podAgentContent'),
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
    },
  ];
}

/**
 * 右侧主表单 schema
 */
export function useRightFormSchema(): VbenFormSchema[] {
  return [
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

    // ─── 右侧主表单字段 ───
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
      fieldName: 'vessel',
      label: $t('seaExport.export.vessel'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'innerVoyno',
      label: $t('seaExport.export.innerVoyno'),
      componentProps: { allowClear: true },
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

    // ─── 代理 ───
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

    // ─── 日期字段 ───
    {
      component: 'DatePicker',
      fieldName: 'goodsCompleteTime',
      label: $t('seaExport.export.goodsCompleteTime'),
      componentProps: { class: 'w-full', showTime: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: $t('seaExport.export.etd'),
      componentProps: { class: 'w-full', showTime: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'eta',
      label: $t('seaExport.export.eta'),
      componentProps: { class: 'w-full', showTime: true },
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
      componentProps: { class: 'w-full', showTime: true },
    },

    // ─── TransportOrder 字段（主提单号、订舱编号等） ───
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

    // ─── 港口 ───
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
      component: 'PortSelect',
      fieldName: 'signingPortId',
      label: $t('seaExport.export.signingPortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },

    // ─── 客户类 ───
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

    // ─── 货物信息 ───
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

    // ─── Textarea 全部放最后，宽度占 2 列；备注与内部备注同一行放最后 ───
    {
      component: 'Textarea',
      fieldName: 'marks',
      label: $t('seaExport.export.marks'),
      componentProps: {
        allowClear: true,
        rows: 2,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-2',
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
      formItemClass: 'col-span-2',
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
      formItemClass: 'col-span-2',
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
      formItemClass: 'col-span-2',
    },
  ];
}

export { getBlTypeOptions, getBillTypeOptions, getIssueTypeOptions };
