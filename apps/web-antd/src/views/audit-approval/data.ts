import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

import { $t } from '#/locales';

/** 进展状态 */
const getProcessedOptions = () => [
  { value: true, label: $t('auditApproval.ProcessedOptions.no') },
  { value: false, label: $t('auditApproval.ProcessedOptions.yes') },
];

export const getTaskStatusOptions = () => [
  {
    value: 0,
    label: $t('auditApproval.task.statusOptions.Auditing'),
    color: '#ff9900',
  },
  {
    value: 1,
    label: $t('auditApproval.task.statusOptions.Rejected'),
    color: '#f56c6c',
  },
  {
    value: 2,
    label: $t('auditApproval.task.statusOptions.Passed'),
    color: '#67c23a',
  },
  {
    value: 3,
    label: $t('auditApproval.task.statusOptions.PartialPassed'),
    color: '#909399',
  },
];

export const getTaskTypeOptions = () => [
  { value: 0, label: $t('auditApproval.task.typeOptions.SubmitOrderFee') },
  { value: 1, label: $t('auditApproval.task.typeOptions.ModifyOrderFee') },
  { value: 2, label: $t('auditApproval.task.typeOptions.DeleteOrderFee') },
];
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
      component: 'Select',
      fieldName: 'Processed',
      label: $t('auditApproval.Processed'),
      componentProps: {
        allowClear: true,
        options: getProcessedOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */
export function useExpenseAllColumns(): VxeTableGridOptions<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>['columns'] {
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
      field: 'submitOrderFeeItemCount',
      title: $t('auditApproval.submitOrderFeeItemCount'),
      minWidth: 120,
    },
    {
      field: 'modifyOrderFeeItemCount',
      title: $t('auditApproval.modifyOrderFeeItemCount'),
      minWidth: 120,
    },
    {
      field: 'deleteOrderFeeItemCount',
      title: $t('auditApproval.deleteOrderFeeItemCount'),
      minWidth: 120,
    },
    // {
    //   field: 'remark',
    //   title: $t('seaExport.export.remark'),
    //   minWidth: 160,
    //   showOverflow: true,
    // },
    // {
    //   field: 'creatorUserName',
    //   title: $t('auditApproval.creatorUserName'),
    //   minWidth: 120,
    // },
    {
      field: 'creationTime',
      title: $t('seaExport.export.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */
export function useColumns(): VxeTableGridOptions<ExpenseSubmissionAdminApi.OrderFeeAuditListDto>['columns'] {
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
      field: 'taskItemCount',
      title: $t('auditApproval.taskItemCount'),
      minWidth: 120,
    },
    {
      field: 'remark',
      title: $t('seaExport.export.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creatorUserName',
      title: $t('auditApproval.creatorUserName'),
      minWidth: 120,
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
  ];
}

/**
 * 相关方信息表单 schema（发货人、收货人、通知人、第二通知人、目的港代理及其内容）
 */
export function usePartyInfoFormSchema(): VbenFormSchema[] {
  return [];
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
