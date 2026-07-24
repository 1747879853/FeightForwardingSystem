import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';

import { $t } from '#/locales';

import { createClientSelectSchema } from '../client/base/data';
import { getSeaExportFeeStatusOptions } from './orderFee/data';

const USER_ATTRIBUTE = {
  operation: 1,
  customerService: 2,
  documentation: 4,
  business: 8,
  sale: 16,
} as const;

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

/** 货物类型（与 ClientAdminApi.CargoType / 后端 CargoType 一致） */
export const CARGO_TYPE = {
  S: 0,
  R: 1,
  D: 2,
  O: 3,
} as const;

/** 货物类型枚举 */
export const getCargoTypeOptions = () => [
  {
    value: CARGO_TYPE.S,
    label: $t('seaExport.export.cargoTypeOptions.normal'),
  },
  {
    value: CARGO_TYPE.R,
    label: $t('seaExport.export.cargoTypeOptions.refrigerated'),
  },
  {
    value: CARGO_TYPE.D,
    label: $t('seaExport.export.cargoTypeOptions.dangerous'),
  },
  {
    value: CARGO_TYPE.O,
    label: $t('seaExport.export.cargoTypeOptions.outOfGauge'),
  },
];

/** 冻柜温度单位（后端仅存 int?，含义由前端维护） */
export const getReeferTemperatureUnitOptions = () => [
  { value: 0, label: '℃' },
  { value: 1, label: '℉' },
];

const getNullableBooleanOptions = () => [
  { value: true, label: $t('common.yes') },
  { value: false, label: $t('common.no') },
];

const cargoExtensionInputProps = () => ({
  allowClear: true,
  maxlength: 32,
  placeholder: $t('ui.placeholder.input'),
});

/** 日期控件：精度到天 */
const DATE_ONLY_PICKER_PROPS = {
  class: 'w-full',
  showTime: false,
  format: 'YYYY-MM-DD',
};

/** 危险品扩展字段名（表单顶层拍平） */
export const DG_FIELD_NAMES = [
  'dgLevel',
  'dgNo',
  'dgPageNo',
  'dgLabel',
  'dgPackingCategory',
  'dgContact',
  'dgTel',
  'dgNetWeight',
  'dgFlashPoint',
  'dgPackingNo',
  'dgMarinePollution',
] as const;

/** 冻柜扩展字段名（表单顶层拍平） */
export const REEFER_FIELD_NAMES = [
  'reeferTemperature',
  'reeferVentilation',
  'reeferHumidity',
  'reeferMinTemperature',
  'reeferMaxTemperature',
  'reeferTemperatureUnit',
  'reeferVentOpen',
] as const;

export function createEmptyDgValues(): Record<
  (typeof DG_FIELD_NAMES)[number],
  undefined
> {
  return {
    dgLevel: undefined,
    dgNo: undefined,
    dgPageNo: undefined,
    dgLabel: undefined,
    dgPackingCategory: undefined,
    dgContact: undefined,
    dgTel: undefined,
    dgNetWeight: undefined,
    dgFlashPoint: undefined,
    dgPackingNo: undefined,
    dgMarinePollution: undefined,
  };
}

export function createEmptyReeferValues(): Record<
  (typeof REEFER_FIELD_NAMES)[number],
  undefined
> {
  return {
    reeferTemperature: undefined,
    reeferVentilation: undefined,
    reeferHumidity: undefined,
    reeferMinTemperature: undefined,
    reeferMaxTemperature: undefined,
    reeferTemperatureUnit: undefined,
    reeferVentOpen: undefined,
  };
}

/**
 * 危险品申报表单 schema（cargoId = 危险品 时展示）
 */
export function useDgFormSchema(): VbenFormSchema[] {
  const inputProps = cargoExtensionInputProps();
  return [
    {
      component: 'Input',
      fieldName: 'dgLevel',
      label: $t('seaExport.export.dgLevel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgNo',
      label: $t('seaExport.export.dgNo'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPageNo',
      label: $t('seaExport.export.dgPageNo'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgLabel',
      label: $t('seaExport.export.dgLabel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPackingCategory',
      label: $t('seaExport.export.dgPackingCategory'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgContact',
      label: $t('seaExport.export.dgContact'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgTel',
      label: $t('seaExport.export.dgTel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgNetWeight',
      label: $t('seaExport.export.dgNetWeight'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgFlashPoint',
      label: $t('seaExport.export.dgFlashPoint'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPackingNo',
      label: $t('seaExport.export.dgPackingNo'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'dgMarinePollution',
      label: $t('seaExport.export.dgMarinePollution'),
      componentProps: {
        allowClear: true,
        options: getNullableBooleanOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

/**
 * 冻柜控制表单 schema（cargoId = 冻柜 时展示）
 */
export function useReeferFormSchema(): VbenFormSchema[] {
  const inputProps = cargoExtensionInputProps();
  return [
    {
      component: 'Input',
      fieldName: 'reeferTemperature',
      label: $t('seaExport.export.reeferTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'reeferTemperatureUnit',
      label: $t('seaExport.export.reeferTemperatureUnit'),
      componentProps: {
        allowClear: true,
        options: getReeferTemperatureUnitOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'reeferMinTemperature',
      label: $t('seaExport.export.reeferMinTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferMaxTemperature',
      label: $t('seaExport.export.reeferMaxTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferVentilation',
      label: $t('seaExport.export.reeferVentilation'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferHumidity',
      label: $t('seaExport.export.reeferHumidity'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'reeferVentOpen',
      label: $t('seaExport.export.reeferVentOpen'),
      componentProps: {
        allowClear: true,
        options: getNullableBooleanOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

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

const getRoleName = (
  orderUsers: SeaExportAdminApi.OrderUserDto[] | undefined,
  userAttribute: number,
) => {
  if (!orderUsers?.length) {
    return '';
  }
  return orderUsers
    .filter((item) => Number(item.userAttribute) === userAttribute)
    .map((item) => item.userNickName)
    .filter(Boolean)
    .join('、');
};

const getPartyName = (
  name: string | undefined,
  fallbackContent: string | undefined,
) => name || fallbackContent || '';

/** 服务任务状态：已处理 */
const SERVICE_TASK_STATUS_PROCESSED = 1;

const getServiceTypeLabel = (
  serviceType: number,
  labelMap?: Map<number, string>,
) => labelMap?.get(Number(serviceType)) ?? `服务项${serviceType}`;

/**
 * 列表「业务状态」进度态：
 * - `upcoming`：无服务项（未开始）
 * - `active`：进行中（存在未完成的服务项）
 * - `done`：全部服务项已完成
 */
export type SeaExportBusinessStatusState = 'active' | 'done' | 'upcoming';

/**
 * 「业务状态」状态色（与详情页顶部服务项目 chevron 颜色保持一致，见 basic-info-form/form.css）。
 */
export const SEA_EXPORT_BUSINESS_STATUS_COLORS: Record<
  SeaExportBusinessStatusState,
  { background: string; color: string }
> = {
  done: { color: '#005313', background: 'rgba(168, 230, 207, 0.45)' },
  active: { color: '#854d0e', background: 'rgba(254, 243, 199, 0.55)' },
  upcoming: { color: '#414752', background: 'rgba(242, 242, 242, 0.6)' },
};

/**
 * 计算列表「业务状态」列的文案与进度态（前端根据 seaExportServices 计算得到）。
 *
 * 规则：服务项按 sortId 升序分组，取「最小 sortId 且组内未全部完成」的分组，
 * 展示该分组内尚未完成的服务项名称（即当前进行到哪个服务）。
 * - 无服务项：文案 '-'，态 `upcoming`
 * - 存在未完成服务项：文案为当前进行中的服务名称，态 `active`
 * - 全部服务项已完成：文案 '已完成'，态 `done`
 */
export function getSeaExportBusinessStatusMeta(
  row: SeaExportAdminApi.SeaExportDto,
  labelMap?: Map<number, string>,
): { state: SeaExportBusinessStatusState; text: string } {
  const services = row.seaExportServices ?? [];
  if (services.length === 0) {
    return { text: '-', state: 'upcoming' };
  }
  const isProcessed = (service: SeaExportAdminApi.SeaExportServiceDto) =>
    Number(service.seServiceTask?.serviceTaskStatus) ===
    SERVICE_TASK_STATUS_PROCESSED;
  const sortIds = [
    ...new Set(services.map((item) => Number(item.sortId))),
  ].sort((a, b) => a - b);
  for (const sortId of sortIds) {
    const groupServices = services.filter(
      (item) => Number(item.sortId) === sortId,
    );
    const groupDone = groupServices.every((item) => isProcessed(item));
    if (!groupDone) {
      const text = groupServices
        .filter((item) => !isProcessed(item))
        .map((item) => getServiceTypeLabel(item.serviceType, labelMap))
        .join('、');
      return { text, state: 'active' };
    }
  }
  return { text: '已完成', state: 'done' };
}

/**
 * 计算列表「业务状态」列文案（前端根据 seaExportServices 计算得到）。
 * 详见 {@link getSeaExportBusinessStatusMeta}。
 */
export function getSeaExportBusinessStatusText(
  row: SeaExportAdminApi.SeaExportDto,
  labelMap?: Map<number, string>,
): string {
  return getSeaExportBusinessStatusMeta(row, labelMap).text;
}

const formatMonth = (value: string | undefined) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

/**
 * 列表搜索表单 schema
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'TrimInput',
      fieldName: 'Keyword',
      label: $t('seaExport.export.keyword'),
      componentProps: {
        placeholder: $t('seaExport.export.keywordPlaceholder'),
        allowClear: true,
        class: 'sea-export-keyword-input',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: '开船日期',
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'AccountDateRange',
      label: $t('seaExport.export.accountDate'),
      formItemClass: 'col-span-2',
      defaultValue: [dayjs().startOf('month'), dayjs().startOf('month')],
      componentProps: {
        allowClear: true,
        class: 'w-full',
        picker: 'month',
        placeholder: ['开始月份', '结束月份'],
      },
    },
    createClientSelectSchema({
      fieldName: 'ClientId',
      industryCategory: 'p',
      label: $t('seaExport.export.clientId'),
    }),
    {
      component: 'PortSelect',
      fieldName: 'POLId',
      label: $t('seaExport.export.polId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        labelKey: 'ediCode',
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'PODId',
      label: $t('seaExport.export.podId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        labelKey: 'ediCode',
      },
    },
    {
      component: 'Input',
      fieldName: 'Vessel',
      label: $t('seaExport.export.vessel'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'InnerVoyno',
      label: $t('seaExport.export.innerVoyno'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'CarrierId',
      label: $t('seaExport.export.carrierId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    createClientSelectSchema({
      fieldName: 'BookingAgentId',
      industryCategory: 'o',
      label: $t('seaExport.export.bookingAgentId'),
    }),
    createClientSelectSchema({
      fieldName: 'YardId',
      industryCategory: 'c',
      label: $t('seaExport.export.yardId'),
    }),
    {
      component: 'UserSelect',
      fieldName: 'SaleId',
      label: $t('system.user.userAttributeOptions.sales'),
      componentProps: {
        allowClear: true,
        userAttribute: USER_ATTRIBUTE.sale,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'OperationId',
      label: $t('system.user.userAttributeOptions.operation'),
      componentProps: {
        allowClear: true,
        userAttribute: USER_ATTRIBUTE.operation,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'BusinessId',
      label: $t('system.user.userAttributeOptions.business'),
      componentProps: {
        allowClear: true,
        userAttribute: USER_ATTRIBUTE.business,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CustomerServiceId',
      label: $t('system.user.userAttributeOptions.customerService'),
      componentProps: {
        allowClear: true,
        userAttribute: USER_ATTRIBUTE.customerService,
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'DocumentationId',
      label: $t('system.user.userAttributeOptions.documentation'),
      componentProps: {
        allowClear: true,
        userAttribute: USER_ATTRIBUTE.documentation,
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'OrgId',
      label: $t('seaExport.export.organizationUnits'),
      componentProps: {
        allowClear: true,
        isCompany: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    createClientSelectSchema({
      fieldName: 'TeamId',
      industryCategory: 'i',
      label: $t('seaExport.export.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'CustBrokerId',
      industryCategory: 'f',
      label: $t('seaExport.export.custBrokerId'),
    }),
    {
      component: 'Input',
      fieldName: 'CtnNo',
      label: $t('seaExport.export.ctnNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ContractNum',
      label: $t('seaExport.export.contractNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'CloseDocTimeRange',
      label: '截单时间',
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        showTime: true,
        placeholder: ['开始时间', '结束时间'],
      },
    },
    {
      component: 'Input',
      fieldName: 'InternalRemark',
      label: $t('seaExport.export.internalRemark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'Remark',
      label: '外部备注',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'CargoId',
      label: $t('seaExport.export.cargoId'),
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'GoodsDes',
      label: $t('seaExport.export.goodsDes'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'CodeSourceId',
      label: $t('seaExport.export.codeSourceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeIssueTypeSelect',
      fieldName: 'CodeIssueTypeId',
      label: $t('seaExport.export.issueType'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'BLType',
      label: $t('seaExport.export.blType'),
      componentProps: {
        allowClear: true,
        options: getBlTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'TradeTermsType',
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
      fieldName: 'BillType',
      label: $t('seaExport.export.billType'),
      componentProps: {
        allowClear: true,
        options: getBillTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'FeeLocked',
      label: $t('seaExport.export.isFeeLocking'),
      componentProps: {
        allowClear: true,
        options: [
          { value: true, label: $t('common.yes') },
          { value: false, label: $t('common.no') },
        ],
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'IsBusinessLocking',
      label: $t('seaExport.export.isBusinessLocking'),
      componentProps: {
        allowClear: true,
        options: [
          { value: true, label: $t('common.yes') },
          { value: false, label: $t('common.no') },
        ],
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

/**
 * 列表列配置（无操作列，第一列为 checkbox 多选列）
 */
export function useColumns(): VxeTableGridOptions<SeaExportAdminApi.SeaExportDto>['columns'] {
  return [
    {
      type: 'checkbox',
      width: 48,
      fixed: 'left',
      align: 'center',
    },
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
      field: 'transportOrder.contractNum',
      title: $t('seaExport.export.contractNum'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'transportOrder.etd',
      title: $t('seaExport.export.etd'),
      minWidth: 140,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.clientName',
      title: $t('seaExport.export.clientId'),
      minWidth: 150,
      showOverflow: true,
      formatter: ({ row }) => row.transportOrder?.client?.name ?? '',
    },
    {
      field: 'carrierCode',
      title: $t('seaExport.export.carrierId'),
      minWidth: 100,
      slots: { default: 'carrierWithLogo' },
    },
    {
      field: 'bookingAgentName',
      title: $t('seaExport.export.bookingAgentId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.bookingAgent?.name ?? '',
    },
    {
      field: 'yardName',
      title: $t('seaExport.export.yardId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.yard?.name ?? '',
    },
    {
      field: 'receivePortName',
      title: $t('seaExport.export.receivePortId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.receivePortRemark ?? '',
    },
    {
      field: 'polName',
      title: $t('seaExport.export.polId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.polRemark ?? '',
    },
    {
      field: 'poT1Name',
      title: $t('seaExport.export.poT1Id'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.poT1Remark ?? '',
    },
    {
      field: 'poT2Name',
      title: $t('seaExport.export.poT2Id'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.poT2Remark ?? '',
    },
    {
      field: 'podName',
      title: $t('seaExport.export.podId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.podRemark ?? '',
    },
    {
      field: 'deliverPortName',
      title: $t('seaExport.export.deliverPortId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.deliverPortRemark ?? '',
    },
    {
      field: 'vessel',
      title: $t('seaExport.export.vessel'),
      minWidth: 120,
      showOverflow: true,
    },
    {
      field: 'innerVoyno',
      title: $t('seaExport.export.innerVoyno'),
      minWidth: 100,
      showOverflow: true,
    },
    {
      field: 'laneName',
      title: $t('seaExport.export.laneName'),
      minWidth: 120,
      showOverflow: true,
    },
    {
      field: 'transportOrder.codeSourceName',
      title: $t('seaExport.export.codeSourceId'),
      minWidth: 110,
      showOverflow: true,
    },
    {
      field: 'transportOrder.codeFrtName',
      title: $t('seaExport.export.codeFrtId'),
      minWidth: 110,
      showOverflow: true,
    },
    {
      field: 'transportOrder.totalCtn',
      title: $t('seaExport.export.orderCtns'),
      minWidth: 120,
      sortable: false,
      showOverflow: true,
    },
    {
      field: 'transportOrder.teu',
      title: 'TEU',
      minWidth: 90,
      sortable: false,
    },
    {
      field: 'operationUserName',
      title: $t('system.user.userAttributeOptions.operation'),
      minWidth: 100,
      sortable: false,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.operation),
      showOverflow: true,
    },
    {
      field: 'saleUserName',
      title: $t('system.user.userAttributeOptions.sales'),
      minWidth: 100,
      sortable: false,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.sale),
      showOverflow: true,
    },
    {
      field: 'customerServiceUserName',
      title: $t('system.user.userAttributeOptions.customerService'),
      minWidth: 120,
      sortable: false,
      formatter: ({ row }) =>
        getRoleName(
          row.transportOrder?.orderUsers,
          USER_ATTRIBUTE.customerService,
        ),
      showOverflow: true,
    },
    {
      field: 'documentationUserName',
      title: $t('system.user.userAttributeOptions.documentation'),
      minWidth: 100,
      sortable: false,
      formatter: ({ row }) =>
        getRoleName(
          row.transportOrder?.orderUsers,
          USER_ATTRIBUTE.documentation,
        ),
      showOverflow: true,
    },
    {
      field: 'businessUserName',
      title: $t('system.user.userAttributeOptions.business'),
      minWidth: 100,
      sortable: false,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.business),
      showOverflow: true,
    },
    {
      field: 'orgs',
      title: $t('seaExport.export.organizationUnits'),
      minWidth: 140,
      sortable: false,
      formatter: ({ row }) => row.orgs?.[0]?.name || '',
      showOverflow: true,
    },
    {
      field: 'transportOrder.accountDate',
      title: $t('seaExport.export.accountDate'),
      minWidth: 110,
      formatter: ({ row }) => formatMonth(row.transportOrder?.accountDate),
    },
    {
      field: 'transportOrder.shipperName',
      title: $t('seaExport.export.shipperId'),
      minWidth: 140,
      sortable: false,
      formatter: ({ row }) =>
        getPartyName(
          row.transportOrder?.shipper?.name,
          row.transportOrder?.shipperContent,
        ),
      showOverflow: true,
    },
    {
      field: 'transportOrder.consigneeName',
      title: $t('seaExport.export.consigneeId'),
      minWidth: 140,
      sortable: false,
      formatter: ({ row }) =>
        getPartyName(
          row.transportOrder?.consignee?.name,
          row.transportOrder?.consigneeContent,
        ),
      showOverflow: true,
    },
    {
      field: 'transportOrder.notifierName',
      title: $t('seaExport.export.notifierId'),
      minWidth: 140,
      sortable: false,
      formatter: ({ row }) =>
        getPartyName(
          row.transportOrder?.notifier?.name,
          row.transportOrder?.notifierContent,
        ),
      showOverflow: true,
    },
    {
      field: 'transportOrder.pkgs',
      title: $t('seaExport.export.pkgs'),
      minWidth: 90,
    },
    {
      field: 'transportOrder.codePackageName',
      title: $t('seaExport.export.codePackageId'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
    },
    {
      field: 'transportOrder.kgs',
      title: $t('seaExport.export.kgs'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.cbm',
      title: $t('seaExport.export.cbm'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.marks',
      title: $t('seaExport.export.marks'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.goodsDes',
      title: $t('seaExport.export.goodsDes'),
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'transportOrder.internalRemark',
      title: $t('seaExport.export.internalRemark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.remark',
      title: '外部备注',
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'codeIssueTypeName',
      title: $t('seaExport.export.issueType'),
      minWidth: 110,
      showOverflow: true,
    },
    {
      field: 'closeDocTime',
      title: $t('seaExport.export.closeDocTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'blType',
      title: $t('seaExport.export.blType'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getBlTypeOptions(),
      },
    },
    {
      field: 'billType',
      title: $t('seaExport.export.billType'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: getBillTypeOptions(),
      },
    },
    {
      field: 'transportOrder.feeLocked',
      title: $t('seaExport.export.isFeeLocking'),
      minWidth: 90,
      align: 'center',
      slots: { default: 'feeLocked' },
    },
    {
      field: 'transportOrder.isBusinessLocking',
      title: $t('seaExport.export.isBusinessLocking'),
      minWidth: 90,
      align: 'center',
      slots: { default: 'businessLocked' },
    },
    {
      field: 'transportOrder.isUnfinished',
      title: '未完结状态',
      minWidth: 100,
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: '未完结', color: 'warning' },
          { value: false, label: '已完结', color: 'success' },
        ],
      },
    },
    {
      field: 'businessStatus',
      title: '业务状态',
      minWidth: 130,
      sortable: false,
      showOverflow: true,
      slots: { default: 'businessStatus' },
    },
    {
      field: 'receiveFeeStatus',
      title: $t('seaExport.export.orderFee.receiveFeeStatus'),
      minWidth: 110,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getSeaExportFeeStatusOptions(),
      },
    },
    {
      field: 'payFeeStatus',
      title: $t('seaExport.export.orderFee.payFeeStatus'),
      minWidth: 110,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getSeaExportFeeStatusOptions(),
      },
    },
    {
      field: 'yundangTrackStatus',
      title: $t('seaExport.yundang.trackStatusColumn'),
      minWidth: 120,
      sortable: false,
      slots: { default: 'yundangTrackStatus' },
    },
    {
      field: 'creatorUserNickName',
      title: '录入人',
      minWidth: 120,
      sortable: false,
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
      // 归属组织实际交互在基础信息头部（按销售绑定组织的 UserOrgSelect）渲染，
      // 此处仅作隐藏的表单值载体，保留必填校验。
      component: 'UserOrgSelect',
      fieldName: 'orgId',
      label: '归属组织',
      rules: 'selectRequired',
      componentProps: {
        autoDefault: false,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
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
      component: 'FrtPrepareInput',
      fieldName: 'codeFrtId',
      label: `${$t('seaExport.export.codeFrtId')}/${$t('seaExport.export.prepareAtId')}`,
      componentProps: (values: Record<string, any>, formApi: any) => ({
        formContext: formApi,
        secondFieldName: 'prepareAtId',
        secondFieldValue: values?.prepareAtId ?? undefined,
        frtProps: {
          placeholder: $t('ui.placeholder.select'),
          allowClear: true,
        },
        prepareProps: {
          placeholder: $t('ui.placeholder.select'),
          allowClear: true,
        },
      }),
    },
    {
      component: 'PortSelect',
      fieldName: 'prepareAtId',
      label: $t('seaExport.export.prepareAtId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        labelKey: 'ediCode',
      },
      formItemClass: 'hidden',
    },
    {
      component: 'ServiceTradeTermsInput',
      fieldName: 'codeServiceId',
      label: `${$t('seaExport.export.codeServiceId')}/${$t('seaExport.export.tradeTermsType')}`,
      componentProps: (values: Record<string, any>, formApi: any) => ({
        formContext: formApi,
        secondFieldName: 'tradeTermsType',
        secondFieldValue: values?.tradeTermsType ?? undefined,
        serviceProps: {
          placeholder: $t('ui.placeholder.select'),
          allowClear: true,
        },
        tradeTermsOptions: getTradeTermsTypeOptions(),
        tradeTermsProps: {
          placeholder: $t('ui.placeholder.select'),
          allowClear: true,
        },
      }),
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
      formItemClass: 'hidden',
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
      component: 'EnglishUpperInput',
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
    {
      component: 'Input',
      fieldName: 'contractNum',
      label: $t('seaExport.export.contractNum'),
      componentProps: { allowClear: true, maxlength: 64 },
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
      component: 'EnglishUpperTextarea',
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
      component: 'EnglishUpperTextarea',
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
      component: 'EnglishUpperTextarea',
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
      component: 'EnglishUpperTextarea',
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
      component: 'EnglishUpperTextarea',
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
        mainRatio: 3,
        secondRatio: 2,
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
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--1',
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: $t('seaExport.export.etd'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--2',
    },
    {
      component: 'DatePicker',
      fieldName: 'atd',
      label: $t('seaExport.export.atd'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--3',
    },
    {
      component: 'DatePicker',
      fieldName: 'eta',
      label: $t('seaExport.export.eta'),
      componentProps: { class: 'w-full' },
      formItemClass: 'shipment-time-item shipment-time-pos--4',
    },
    {
      component: 'DatePicker',
      fieldName: 'closingTime',
      label: $t('seaExport.export.closingTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass: 'shipment-time-item shipment-time-pos--5 hidden',
    },
    {
      component: 'DatePicker',
      fieldName: 'closeVgmTime',
      label: $t('seaExport.export.closeVgmTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass: 'shipment-time-item shipment-time-pos--5',
    },
    {
      component: 'DatePicker',
      fieldName: 'closeDocTime',
      label: $t('seaExport.export.closeDocTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass: 'shipment-time-item shipment-time-pos--6',
    },
    {
      component: 'DatePicker',
      fieldName: 'closeManifestTime',
      label: $t('seaExport.export.closeManifestTime'),
      componentProps: { class: 'w-full', showTime: true },
      formItemClass:
        'shipment-time-item shipment-time-item--last shipment-time-pos--7',
    },
    {
      component: 'PortSelect',
      fieldName: 'signingPortId',
      label: $t('seaExport.export.signingPortId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        labelKey: 'ediCode',
      },
      formItemClass: 'hidden',
    },
    {
      component: 'DatePicker',
      fieldName: 'signingTime',
      label: $t('seaExport.export.signingTime'),
      componentProps: {
        class: 'w-full',
      },
      formItemClass: 'hidden',
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

/** 港口表单项扩展：`PortSelect` 的 `@change` 含 `option.raw`，由业务层联动备注等 */
export type PortFormSchemaOptions = {
  onPortChange?: (fieldName: string, value: unknown, option: unknown) => void;
};

function buildPortSelectProps(
  fieldName: string,
  onPortChange?: PortFormSchemaOptions['onPortChange'],
) {
  return {
    allowClear: true,
    labelKey: 'ediCode',
    placeholder: $t('ui.placeholder.select'),
    ...(onPortChange
      ? {
          onChange: (value: unknown, option: unknown) =>
            onPortChange(fieldName, value, option),
        }
      : {}),
  };
}

/**
 * 港口信息表单 schema
 * 货物流转节点按顺序展示：收货地 -> 起运港 -> 中转港（Tab切换1/2） -> 目的港 -> 交货地
 */
export function usePortFormSchema(
  options?: PortFormSchemaOptions,
): VbenFormSchema[] {
  const { onPortChange } = options ?? {};
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
      fieldName: 'poT1Id',
      label: '',
      componentProps: buildPortSelectProps('poT1Id', onPortChange),
      formItemClass:
        'port-flow-item port-flow-item--transit port-flow-pos--transit',
    },
    {
      component: 'PortSelect',
      fieldName: 'poT2Id',
      label: '',
      componentProps: buildPortSelectProps('poT2Id', onPortChange),
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
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'receivePortRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--receive-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'polRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--pol-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'poT1Remark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass:
        'port-flow-remark port-flow-remark--transit port-flow-pos--transit-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'poT2Remark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass:
        'port-flow-remark port-flow-remark--transit port-flow-remark--transit-secondary port-flow-pos--transit-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'podRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--pod-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'deliverPortRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--deliver-remark',
    },
    {
      component: 'PortSelect',
      fieldName: 'signingPortId',
      label: $t('seaExport.export.signingPortId'),
      componentProps: buildPortSelectProps('signingPortId', onPortChange),
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
      component: 'CodeGoodsSelect',
      fieldName: 'orderCodeGoodss',
      label: $t('seaExport.export.orderCodeGoodss'),
      componentProps: {
        mode: 'multiple',
        showNameWithHsCode: true,
        placeholder: $t('seaExport.export.pleaseSelectGoods'),
        allowClear: true,
      },
      formItemClass: 'col-span-2',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'marks',
      label: $t('seaExport.export.marks'),
      componentProps: {
        allowClear: true,
        rows: 7,
      },
      formItemClass: 'col-span-3 cargo-main-item cargo-main-item--marks',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'goodsDes',
      label: $t('seaExport.export.goodsDes'),
      componentProps: {
        allowClear: true,
        rows: 7,
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
      fieldName: 'internalRemark',
      label: `${$t('seaExport.export.internalRemark')}(仅内部可见)`,
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
      label: '外部备注',
      componentProps: {
        allowClear: true,
        rows: 3,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
  ];
}

export {
  getBlTypeOptions,
  getBillTypeOptions,
  getIssueTypeOptions,
  getTradeTermsTypeOptions,
};
