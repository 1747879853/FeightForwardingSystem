import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { $t } from '#/locales';
import { weightVolumeInputNumberProps } from '#/utils/weight-volume-precision';

import { createClientSelectSchema } from '../client/base/data';

/** 干系人角色位值（与后端 UserAttribute 一致） */
const USER_ATTRIBUTE = {
  operation: 1,
  customerService: 2,
  documentation: 4,
  business: 8,
  sale: 16,
} as const;

/** 销售角色：每票有且只有一个 */
export const SALE_USER_ATTRIBUTE = USER_ATTRIBUTE.sale;

/** 体积重系数：写死的常量，不随航司或航线变化 */
export const VOLUME_WEIGHT_FACTOR = 167;

/** 长宽高 / 体积重 / 计费重 / 泡比仍为 6 位；KGS/CBM 见 WEIGHT_VOLUME_PRECISION */
export const AIR_DECIMAL_PRECISION = 6;

export const CARGO_TYPE = {
  S: 0,
  R: 1,
  D: 2,
  O: 3,
} as const;

/** 货物类型枚举（超限箱在空运没有对应录入位，选中后不展示任何扩展区） */
export const getCargoTypeOptions = () => [
  {
    value: CARGO_TYPE.S,
    label: $t('airExport.export.cargoTypeOptions.normal'),
  },
  {
    value: CARGO_TYPE.R,
    label: $t('airExport.export.cargoTypeOptions.refrigerated'),
  },
  {
    value: CARGO_TYPE.D,
    label: $t('airExport.export.cargoTypeOptions.dangerous'),
  },
  {
    value: CARGO_TYPE.O,
    label: $t('airExport.export.cargoTypeOptions.outOfGauge'),
  },
];

/** 冻柜温度单位（后端仅存 int?，含义由前端维护） */
export const getReeferTemperatureUnitOptions = () => [
  { value: 0, label: '℃' },
  { value: 1, label: '℉' },
];

/** 录入方式：业务联系单导入在空运不会出现，仅为历史数据兜底 */
export const getInputTypeOptions = () => [
  { value: 0, label: $t('airExport.export.inputTypeOptions.manual') },
  { value: 1, label: $t('airExport.export.inputTypeOptions.preOrder') },
  {
    value: 2,
    label: $t('airExport.export.inputTypeOptions.copy'),
    color: 'blue',
  },
];

/** 组合费用状态：与费用模块口径一致，用于渲染应收/应付状态列 */
export const getAirExportFeeStatusOptions = () => [
  { value: 0, label: '录入状态', color: '#b8cdd7' },
  { value: 1, label: '提交审核', color: '#ffc107' },
  { value: 2, label: '审核通过', color: '#67c23a' },
  { value: 3, label: '部分结算', color: '#87ceeb' },
  { value: 4, label: '结算完毕', color: '#409eff' },
  { value: 5, label: '驳回', color: '#f56c6c' },
  { value: 6, label: '申请修改', color: '#e6a23c' },
  { value: 7, label: '申请删除', color: '#ff7875' },
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

/** 列表空港列：三字码/英文名，缺一项时只展示有的那一项，不留孤立斜杠 */
export const formatAirPortLabel = (
  port?: AirExportAdminApi.AirPortSimpleDto | null,
) => {
  const iataCode = (port?.iataCode ?? '').trim();
  const enName = (port?.enName ?? '').trim();
  if (iataCode && enName) return `${iataCode}/${enName}`;
  return iataCode || enName || '';
};

/** 选中空港后备注回填英文名 */
export const formatAirPortRemark = (
  port?: AirExportAdminApi.AirPortSimpleDto | null,
) => (port?.enName ?? '').trim();

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

/** 危险品申报表单 schema（cargoId = 危险品 时展示） */
export function useDgFormSchema(): VbenFormSchema[] {
  const inputProps = cargoExtensionInputProps();
  return [
    {
      component: 'Input',
      fieldName: 'dgLevel',
      label: $t('airExport.export.dgLevel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgNo',
      label: $t('airExport.export.dgNo'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPageNo',
      label: $t('airExport.export.dgPageNo'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgLabel',
      label: $t('airExport.export.dgLabel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPackingCategory',
      label: $t('airExport.export.dgPackingCategory'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgContact',
      label: $t('airExport.export.dgContact'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgTel',
      label: $t('airExport.export.dgTel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgNetWeight',
      label: $t('airExport.export.dgNetWeight'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgFlashPoint',
      label: $t('airExport.export.dgFlashPoint'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPackingNo',
      label: $t('airExport.export.dgPackingNo'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'dgMarinePollution',
      label: $t('airExport.export.dgMarinePollution'),
      componentProps: {
        allowClear: true,
        options: getNullableBooleanOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

/** 冻柜控制表单 schema（cargoId = 冻柜 时展示） */
export function useReeferFormSchema(): VbenFormSchema[] {
  const inputProps = cargoExtensionInputProps();
  return [
    {
      component: 'Input',
      fieldName: 'reeferTemperature',
      label: $t('airExport.export.reeferTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'reeferTemperatureUnit',
      label: $t('airExport.export.reeferTemperatureUnit'),
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
      label: $t('airExport.export.reeferMinTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferMaxTemperature',
      label: $t('airExport.export.reeferMaxTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferVentilation',
      label: $t('airExport.export.reeferVentilation'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferHumidity',
      label: $t('airExport.export.reeferHumidity'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'reeferVentOpen',
      label: $t('airExport.export.reeferVentOpen'),
      componentProps: {
        allowClear: true,
        options: getNullableBooleanOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

const getRoleName = (
  orderUsers: AirExportAdminApi.OrderUserDto[] | undefined,
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

const formatMonth = (value: null | string | undefined) => {
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

/** 明细行合计：整票没有计费重/体积重字段，需要界面自行相加 */
const sumCtnField = (
  rows: AirExportAdminApi.AirExportOrderCtnDto[] | undefined,
  field: 'chargeWeight' | 'volumeWeight',
) => {
  if (!rows?.length) return '';
  let hasValue = false;
  let total = 0;
  for (const row of rows) {
    const value = Number(row?.[field]);
    if (Number.isFinite(value)) {
      hasValue = true;
      total += value;
    }
  }
  if (!hasValue) return '';
  return String(Number.parseFloat(total.toFixed(AIR_DECIMAL_PRECISION)));
};

const airPortSelectProps = {
  allowClear: true,
  labelKey: 'iataCode',
  placeholder: $t('ui.placeholder.select'),
};

/**
 * 列表搜索表单 schema。
 * 字段名即接口入参名（首字母大写），日期区间在 list.vue 里拆成 Start / End。
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'TrimInput',
      fieldName: 'Keyword',
      label: $t('airExport.export.keyword'),
      componentProps: {
        placeholder: $t('airExport.export.keywordPlaceholder'),
        allowClear: true,
        class: 'air-export-keyword-input',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: $t('airExport.export.etd'),
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
      label: $t('airExport.export.accountDate'),
      formItemClass: 'col-span-2',
      // 默认当月由 list.vue onMounted 写入；不设 defaultValue，否则「重置」会回到当月而非清空
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
      label: $t('airExport.export.clientId'),
    }),
    {
      component: 'Input',
      fieldName: 'FlightNo',
      label: $t('airExport.export.flightNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'AirPortSelect',
      fieldName: 'POLId',
      label: $t('airExport.export.polId'),
      componentProps: airPortSelectProps,
    },
    {
      component: 'AirPortSelect',
      fieldName: 'POTId',
      label: $t('airExport.export.potId'),
      componentProps: airPortSelectProps,
    },
    {
      component: 'AirPortSelect',
      fieldName: 'PODId',
      label: $t('airExport.export.podId'),
      componentProps: airPortSelectProps,
    },
    createClientSelectSchema({
      fieldName: 'BookingAgentId',
      industryCategory: 'o',
      label: $t('airExport.export.bookingAgentId'),
    }),
    {
      component: 'Input',
      fieldName: 'MblNum',
      label: $t('airExport.export.mblNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'CommissionNum',
      label: $t('airExport.export.commissionNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ContractNum',
      label: $t('airExport.export.contractNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'POLRemark',
      label: $t('airExport.export.polRemark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'POTRemark',
      label: $t('airExport.export.potRemark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'PODRemark',
      label: $t('airExport.export.podRemark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ATDRange',
      label: $t('airExport.export.atd'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETARange',
      label: $t('airExport.export.eta'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'GoodsCompleteTimeRange',
      label: $t('airExport.export.goodsCompleteTime'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'CustomsDeclareDateRange',
      label: $t('airExport.export.customsDeclareDate'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'DeliveryWarehouseDateRange',
      label: $t('airExport.export.deliveryWarehouseDate'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'SettlementDateRange',
      label: $t('airExport.export.settlementDate'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'CreationTimeRange',
      label: $t('airExport.export.creationTime'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
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
      label: $t('airExport.export.organizationUnits'),
      componentProps: {
        allowClear: true,
        isCompany: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    createClientSelectSchema({
      fieldName: 'TeamId',
      industryCategory: 'i',
      label: $t('airExport.export.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'CustBrokerId',
      industryCategory: 'f',
      label: $t('airExport.export.custBrokerId'),
    }),
    createClientSelectSchema({
      fieldName: 'WarehouseId',
      industryCategory: 'q',
      label: $t('airExport.export.warehouseId'),
    }),
    createClientSelectSchema({
      fieldName: 'InsuranceId',
      industryCategory: 'r',
      label: $t('airExport.export.insuranceId'),
    }),
    createClientSelectSchema({
      fieldName: 'ShipperId',
      industryCategory: 'b',
      label: $t('airExport.export.shipperId'),
    }),
    createClientSelectSchema({
      fieldName: 'ConsigneeId',
      industryCategory: 'e',
      label: $t('airExport.export.consigneeId'),
    }),
    createClientSelectSchema({
      fieldName: 'NotifierId',
      industryCategory: 'h',
      label: $t('airExport.export.notifierId'),
    }),
    {
      component: 'Input',
      fieldName: 'ShipperContent',
      label: $t('airExport.export.shipperContent'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ConsigneeContent',
      label: $t('airExport.export.consigneeContent'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'NotifierContent',
      label: $t('airExport.export.notifierContent'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'CargoId',
      label: $t('airExport.export.cargoId'),
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'CodePackageSelect',
      fieldName: 'CodePackageId',
      label: $t('airExport.export.codePackageId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'GoodsDes',
      label: $t('airExport.export.goodsDes'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'Marks',
      label: $t('airExport.export.marks'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'CodeSourceId',
      label: $t('airExport.export.codeSourceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeServiceSelect',
      fieldName: 'CodeServiceId',
      label: $t('airExport.export.codeServiceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'InternalRemark',
      label: $t('airExport.export.internalRemark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'InputType',
      label: $t('airExport.export.inputType'),
      componentProps: {
        allowClear: true,
        options: getInputTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'FeeLocked',
      label: $t('airExport.export.isFeeLocking'),
      componentProps: {
        allowClear: true,
        options: getNullableBooleanOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'IsBusinessLocking',
      label: $t('airExport.export.isBusinessLocking'),
      componentProps: {
        allowClear: true,
        options: getNullableBooleanOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'IsUnfinished',
      label: $t('airExport.export.isUnfinished'),
      componentProps: {
        allowClear: true,
        options: [
          { value: true, label: $t('airExport.export.unfinished') },
          { value: false, label: $t('airExport.export.finished') },
        ],
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

/**
 * 列表列排序字段映射：前端列名 → 后端排序表达式。
 * 关联表出参是对象，列本身不可直接排序，需映射到后端导航属性路径。
 */
export const AIR_EXPORT_SORT_FIELD_MAP: Record<string, string> = {
  'transportOrder.clientName': 'TransportOrder.Client.Name',
  'transportOrder.codeSource.cnName': 'TransportOrder.CodeSource.CnName',
  'transportOrder.codeSourceName': 'TransportOrder.CodeSource.CnName',
  'transportOrder.codeServiceName': 'TransportOrder.CodeService.CnName',
  bookingAgentName: 'BookingAgent.Name',
  polName: 'POL.IataCode',
  potName: 'POT.IataCode',
  podName: 'POD.IataCode',
};

/**
 * 列表列配置（无操作列，第一列为 checkbox 多选列）
 */
export function useColumns(): VxeTableGridOptions<AirExportAdminApi.AirExportDto>['columns'] {
  return [
    {
      type: 'checkbox',
      width: 48,
      fixed: 'left',
      align: 'center',
    },
    {
      field: 'transportOrder.commissionNum',
      title: $t('airExport.export.commissionNum'),
      minWidth: 140,
    },
    {
      field: 'transportOrder.inputType',
      title: $t('airExport.export.inputType'),
      minWidth: 100,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getInputTypeOptions(),
      },
    },
    {
      field: 'transportOrder.mblNum',
      title: $t('airExport.export.mblNum'),
      minWidth: 160,
      showOverflow: true,
      // 有运踪异常预警时，在单号前展示黄色叹号（悬停看原因）
      slots: { default: 'mblNum' },
    },
    {
      field: 'flightNo',
      title: $t('airExport.export.flightNo'),
      minWidth: 110,
      showOverflow: true,
    },
    {
      field: 'transportOrder.etd',
      title: $t('airExport.export.etd'),
      minWidth: 110,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.atd',
      title: $t('airExport.export.atd'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.eta',
      title: $t('airExport.export.eta'),
      minWidth: 110,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.clientName',
      title: $t('airExport.export.clientId'),
      minWidth: 150,
      showOverflow: true,
      formatter: ({ row }) => row.transportOrder?.client?.name ?? '',
    },
    {
      field: 'polName',
      title: $t('airExport.export.polId'),
      minWidth: 150,
      showOverflow: true,
      formatter: ({ row }) => formatAirPortLabel(row.pol),
    },
    {
      field: 'potName',
      title: $t('airExport.export.potId'),
      minWidth: 150,
      showOverflow: true,
      formatter: ({ row }) => formatAirPortLabel(row.pot),
    },
    {
      field: 'podName',
      title: $t('airExport.export.podId'),
      minWidth: 150,
      showOverflow: true,
      formatter: ({ row }) => formatAirPortLabel(row.pod),
    },
    {
      field: 'bookingAgentName',
      title: $t('airExport.export.bookingAgentId'),
      minWidth: 140,
      showOverflow: true,
      formatter: ({ row }) => row.bookingAgent?.name ?? '',
    },
    {
      field: 'transportOrder.contractNum',
      title: $t('airExport.export.contractNum'),
      minWidth: 130,
      showOverflow: true,
    },
    {
      field: 'transportOrder.codeSource.cnName',
      title: $t('airExport.export.codeSourceId'),
      minWidth: 110,
      showOverflow: true,
      formatter: ({ row }) => row.transportOrder?.codeSource?.cnName ?? '',
    },
    {
      field: 'transportOrder.codeServiceName',
      title: $t('airExport.export.codeServiceId'),
      minWidth: 110,
      showOverflow: true,
      formatter: ({ row }) =>
        row.transportOrder?.codeService?.cnName ||
        row.transportOrder?.codeServiceName ||
        '',
    },
    {
      field: 'transportOrder.pkgs',
      title: $t('airExport.export.pkgs'),
      minWidth: 90,
    },
    {
      field: 'transportOrder.codePackageName',
      title: $t('airExport.export.codePackageId'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        row.transportOrder?.codePackage?.name ||
        row.transportOrder?.codePackageName ||
        '',
    },
    {
      field: 'transportOrder.kgs',
      title: $t('airExport.export.kgs'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.cbm',
      title: $t('airExport.export.cbm'),
      minWidth: 100,
    },
    {
      field: 'bubbleRatio',
      title: $t('airExport.export.bubbleRatio'),
      minWidth: 100,
    },
    {
      field: 'volumeWeightTotal',
      title: $t('airExport.export.volumeWeightTotal'),
      minWidth: 130,
      sortable: false,
      formatter: ({ row }) =>
        sumCtnField(row.airExportOrderCtns, 'volumeWeight'),
    },
    {
      field: 'chargeWeightTotal',
      title: $t('airExport.export.chargeWeightTotal'),
      minWidth: 130,
      sortable: false,
      formatter: ({ row }) =>
        sumCtnField(row.airExportOrderCtns, 'chargeWeight'),
    },
    {
      field: 'customsDeclareDate',
      title: $t('airExport.export.customsDeclareDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'deliveryWarehouseDate',
      title: $t('airExport.export.deliveryWarehouseDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.goodsCompleteTime',
      title: $t('airExport.export.goodsCompleteTime'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'saleUserName',
      title: $t('system.user.userAttributeOptions.sales'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.sale),
    },
    {
      field: 'operationUserName',
      title: $t('system.user.userAttributeOptions.operation'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.operation),
    },
    {
      field: 'customerServiceUserName',
      title: $t('system.user.userAttributeOptions.customerService'),
      minWidth: 120,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getRoleName(
          row.transportOrder?.orderUsers,
          USER_ATTRIBUTE.customerService,
        ),
    },
    {
      field: 'documentationUserName',
      title: $t('system.user.userAttributeOptions.documentation'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getRoleName(
          row.transportOrder?.orderUsers,
          USER_ATTRIBUTE.documentation,
        ),
    },
    {
      field: 'businessUserName',
      title: $t('system.user.userAttributeOptions.business'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.business),
    },
    {
      field: 'orgs',
      title: $t('airExport.export.organizationUnits'),
      minWidth: 140,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) => row.orgs?.[0]?.name || '',
    },
    {
      field: 'transportOrder.accountDate',
      title: $t('airExport.export.accountDate'),
      minWidth: 110,
      formatter: ({ row }) => formatMonth(row.transportOrder?.accountDate),
    },
    {
      field: 'transportOrder.settlementDate',
      title: $t('airExport.export.settlementDate'),
      minWidth: 110,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.shipperName',
      title: $t('airExport.export.shipperId'),
      minWidth: 140,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getPartyName(
          row.transportOrder?.shipper?.name ?? undefined,
          row.transportOrder?.shipperContent ?? undefined,
        ),
    },
    {
      field: 'transportOrder.consigneeName',
      title: $t('airExport.export.consigneeId'),
      minWidth: 140,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getPartyName(
          row.transportOrder?.consignee?.name ?? undefined,
          row.transportOrder?.consigneeContent ?? undefined,
        ),
    },
    {
      field: 'transportOrder.notifierName',
      title: $t('airExport.export.notifierId'),
      minWidth: 140,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        getPartyName(
          row.transportOrder?.notifier?.name ?? undefined,
          row.transportOrder?.notifierContent ?? undefined,
        ),
    },
    {
      field: 'transportOrder.marks',
      title: $t('airExport.export.marks'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.goodsDes',
      title: $t('airExport.export.goodsDes'),
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'transportOrder.internalRemark',
      title: $t('airExport.export.internalRemark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.remark',
      title: $t('airExport.export.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.feeLocked',
      title: $t('airExport.export.isFeeLocking'),
      minWidth: 90,
      align: 'center',
      slots: { default: 'feeLocked' },
    },
    {
      field: 'transportOrder.isBusinessLocking',
      title: $t('airExport.export.isBusinessLocking'),
      minWidth: 90,
      align: 'center',
      slots: { default: 'businessLocked' },
    },
    {
      field: 'transportOrder.isUnfinished',
      title: $t('airExport.export.isUnfinished'),
      minWidth: 100,
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: [
          {
            value: true,
            label: $t('airExport.export.unfinished'),
            color: 'warning',
          },
          {
            value: false,
            label: $t('airExport.export.finished'),
            color: 'success',
          },
        ],
      },
    },
    {
      field: 'receiveFeeStatus',
      title: $t('airExport.export.receiveFeeStatus'),
      minWidth: 110,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getAirExportFeeStatusOptions(),
      },
    },
    {
      field: 'payFeeStatus',
      title: $t('airExport.export.payFeeStatus'),
      minWidth: 110,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getAirExportFeeStatusOptions(),
      },
    },
    {
      // 字段名沿用历史值，避免用户已保存的列配置失效；内容取新服务商运踪摘要
      field: 'yundangTrackStatus',
      title: $t('tracking.trackStatusColumn'),
      minWidth: 130,
      sortable: false,
      slots: { default: 'yundangTrackStatus' },
    },
    {
      field: 'creatorUserNickName',
      title: $t('airExport.export.creatorUserNickName'),
      minWidth: 120,
      sortable: false,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('airExport.export.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}

/**
 * 基础信息表单 schema（顶部）。
 * 委托编号 / 会计期间 / 应结日期只读，由后端接管。
 */
export function useBasicInfoFormSchema(isEdit = false): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'commissionNum',
      label: $t('airExport.export.commissionNum'),
      componentProps: {
        disabled: true,
        placeholder: isEdit
          ? ''
          : $t('airExport.export.commissionNumAutoGenerate'),
      },
    },
    {
      // 归属组织实际交互在基础信息头部（按销售绑定组织的 UserOrgSelect）渲染，
      // 此处仅作隐藏的表单值载体，保留必填校验。
      component: 'UserOrgSelect',
      fieldName: 'orgId',
      label: $t('airExport.export.organizationUnits'),
      rules: 'selectRequired',
      componentProps: {
        autoDefault: false,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'accountDate',
      label: $t('airExport.export.accountDate'),
      componentProps: {
        class: 'w-full',
        picker: 'month',
        disabled: true,
        placeholder: isEdit
          ? undefined
          : $t('airExport.export.commissionNumAutoGenerate'),
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'settlementDate',
      label: $t('airExport.export.settlementDate'),
      componentProps: {
        class: 'w-full',
        disabled: true,
        placeholder: isEdit
          ? undefined
          : $t('airExport.export.commissionNumAutoGenerate'),
      },
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceId',
      label: $t('airExport.export.codeSourceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeServiceSelect',
      fieldName: 'codeServiceId',
      label: $t('airExport.export.codeServiceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'cargoId',
      label: $t('airExport.export.cargoId'),
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'mblNum',
      label: $t('airExport.export.mblNum'),
      componentProps: { allowClear: true, maxlength: 64 },
    },
    {
      component: 'Input',
      fieldName: 'contractNum',
      label: $t('airExport.export.contractNum'),
      componentProps: { allowClear: true, maxlength: 64 },
    },
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: $t('airExport.export.clientId'),
      rules: 'selectRequired',
    }),
    createClientSelectSchema({
      fieldName: 'teamId',
      industryCategory: 'i',
      label: $t('airExport.export.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'custBrokerId',
      industryCategory: 'f',
      label: $t('airExport.export.custBrokerId'),
    }),
    createClientSelectSchema({
      fieldName: 'warehouseId',
      industryCategory: 'q',
      label: $t('airExport.export.warehouseId'),
    }),
    createClientSelectSchema({
      fieldName: 'insuranceId',
      industryCategory: 'r',
      label: $t('airExport.export.insuranceId'),
    }),
  ];
}

/**
 * 相关方信息表单 schema（发货人、收货人、通知人及其内容）。
 * 干系人不走 schema：销售角色必填且与所属组织联动，由 OrderUsersPanel 单独渲染。
 */
export function usePartyInfoFormSchema(): VbenFormSchema[] {
  const contentProps = {
    allowClear: true,
    rows: 4,
    style: { minHeight: '110px' },
  };
  return [
    {
      // 干系人交互在右侧面板，这里只做表单值载体，便于统一取值与脏检查
      component: 'OrderUsersButton',
      fieldName: 'orderUsers',
      label: $t('airExport.export.orderUsers'),
      formItemClass: 'party-flow-order-users-hidden',
    },
    createClientSelectSchema({
      fieldName: 'shipperId',
      industryCategory: 'b',
      label: $t('airExport.export.shipperId'),
      formItemClass: 'party-flow-item party-flow-pos--1',
    }),
    createClientSelectSchema({
      fieldName: 'consigneeId',
      industryCategory: 'e',
      label: $t('airExport.export.consigneeId'),
      formItemClass: 'party-flow-item party-flow-pos--2',
    }),
    createClientSelectSchema({
      fieldName: 'notifierId',
      industryCategory: 'h',
      label: $t('airExport.export.notifierId'),
      formItemClass: 'party-flow-item party-flow-pos--3',
    }),
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'shipperContent',
      label: '',
      componentProps: contentProps,
      formItemClass: 'party-flow-content party-flow-content-pos--1',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'consigneeContent',
      label: '',
      componentProps: contentProps,
      formItemClass: 'party-flow-content party-flow-content-pos--2',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'notifierContent',
      label: '',
      componentProps: contentProps,
      formItemClass: 'party-flow-content party-flow-content-pos--3',
    },
  ];
}

/**
 * 日期区 schema：按作业顺序排成流程条。
 * 起飞日期 = ETD（驱动会计期间与应结日期），实际起飞日期 = ATD，预抵日期 = ETA。
 * 报关日期 / 送仓日期没有任何自动带出规则，全靠手填。
 */
export function useDateFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      fieldName: 'goodsCompleteTime',
      label: $t('airExport.export.goodsCompleteTime'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--1',
    },
    {
      component: 'DatePicker',
      fieldName: 'deliveryWarehouseDate',
      label: $t('airExport.export.deliveryWarehouseDate'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--2',
    },
    {
      component: 'DatePicker',
      fieldName: 'customsDeclareDate',
      label: $t('airExport.export.customsDeclareDate'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--3',
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: $t('airExport.export.etd'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--4',
    },
    {
      component: 'DatePicker',
      fieldName: 'atd',
      label: $t('airExport.export.atd'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--5',
    },
    {
      component: 'DatePicker',
      fieldName: 'eta',
      label: $t('airExport.export.eta'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass:
        'shipment-time-item shipment-time-item--last shipment-time-pos--6',
    },
  ];
}

/** 航段表单项扩展：`AirPortSelect` 的 `@change` 含 `option.raw`，由业务层联动备注 */
export type AirPortFormSchemaOptions = {
  onAirPortChange?: (
    fieldName: string,
    value: unknown,
    option: unknown,
  ) => void;
};

/** AirPortSelect 的 `option` 可能是数组（多选）或单个对象 */
export function pickAirPortSelectOption(option: unknown) {
  const target = Array.isArray(option) ? option[0] : option;
  return target as { raw?: AirExportAdminApi.AirPortSimpleDto } | undefined;
}

function buildAirPortSelectProps(
  fieldName: string,
  onAirPortChange?: AirPortFormSchemaOptions['onAirPortChange'],
) {
  return {
    allowClear: true,
    labelKey: 'iataCode',
    placeholder: $t('ui.placeholder.select'),
    ...(onAirPortChange
      ? {
          onChange: (value: unknown, option: unknown) =>
            onAirPortChange(fieldName, value, option),
        }
      : {}),
  };
}

/** 航段标题栏内联字段：航班、订舱代理 */
export const AIR_LEG_HEADER_FIELD_NAMES = [
  'flightNo',
  'bookingAgentId',
] as const;

/**
 * 航段信息 schema：起运地 → 中转地 → 目的地（各带备注），外加航班与订舱代理。
 * 航班与订舱代理由表单放到「航段信息」标题右侧，不占航段栅格。
 * 空运只有一个中转地，且不带出国家、城市、时区与航线。
 */
export function useAirLegFormSchema(
  options?: AirPortFormSchemaOptions,
): VbenFormSchema[] {
  const { onAirPortChange } = options ?? {};
  return [
    {
      component: 'AirPortSelect',
      fieldName: 'polId',
      label: $t('airExport.export.polId'),
      componentProps: buildAirPortSelectProps('polId', onAirPortChange),
      formItemClass: 'port-flow-item port-flow-pos--pol',
    },
    {
      component: 'AirPortSelect',
      fieldName: 'potId',
      label: $t('airExport.export.potId'),
      componentProps: buildAirPortSelectProps('potId', onAirPortChange),
      formItemClass: 'port-flow-item port-flow-pos--pot',
    },
    {
      component: 'AirPortSelect',
      fieldName: 'podId',
      label: $t('airExport.export.podId'),
      componentProps: buildAirPortSelectProps('podId', onAirPortChange),
      formItemClass: 'port-flow-item port-flow-item--last port-flow-pos--pod',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'polRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1, maxlength: 1024 },
      formItemClass: 'port-flow-remark port-flow-pos--pol-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'potRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1, maxlength: 1024 },
      formItemClass: 'port-flow-remark port-flow-pos--pot-remark',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'podRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1, maxlength: 1024 },
      formItemClass: 'port-flow-remark port-flow-pos--pod-remark',
    },
    {
      component: 'Input',
      fieldName: 'flightNo',
      label: $t('airExport.export.flightNo'),
      componentProps: {
        allowClear: true,
        maxlength: 64,
        placeholder: $t('ui.placeholder.input'),
      },
      formItemClass:
        'flight-info-header__item flight-info-header__item--flight',
    },
    {
      ...createClientSelectSchema({
        fieldName: 'bookingAgentId',
        industryCategory: 'o',
        label: $t('airExport.export.bookingAgentId'),
      }),
      formItemClass:
        'flight-info-header__item flight-info-header__item--booking-agent',
    },
  ];
}

/**
 * 货物信息表单 schema。
 * 泡比由毛重 ÷ 体积带出，允许手改；货物明细由 AirExportOrderCtnTable 单独渲染。
 */
export function useCargoFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'CodeGoodsSelect',
      fieldName: 'orderCodeGoodss',
      label: $t('airExport.export.orderCodeGoodss'),
      componentProps: {
        mode: 'multiple',
        showNameWithHsCode: true,
        placeholder: $t('airExport.export.pleaseSelectGoods'),
        allowClear: true,
      },
      formItemClass: 'col-span-2',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'marks',
      label: $t('airExport.export.marks'),
      componentProps: { allowClear: true, rows: 7 },
      formItemClass: 'col-span-2 cargo-main-item cargo-main-item--marks',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'goodsDes',
      label: $t('airExport.export.goodsDes'),
      componentProps: { allowClear: true, rows: 7 },
      formItemClass: 'col-span-3 cargo-main-item cargo-main-item--goods-des',
    },
    {
      component: 'PkgsPackageInput',
      fieldName: 'pkgs',
      label: $t('airExport.export.pkgsPackage'),
      componentProps: (values: Record<string, any>, formApi: any) => ({
        formContext: formApi,
        secondFieldName: 'codePackageId',
        secondFieldValue: values?.codePackageId,
      }),
      formItemClass: 'cargo-metrics-item cargo-metrics-item--pkgs',
    },
    {
      component: 'CodePackageSelect',
      fieldName: 'codePackageId',
      label: '',
      formItemClass: 'hidden',
      componentProps: { class: 'hidden' },
    },
    {
      component: 'InputNumber',
      fieldName: 'kgs',
      label: $t('airExport.export.kgs'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        ...weightVolumeInputNumberProps,
      },
      formItemClass: 'cargo-metrics-item cargo-metrics-item--kgs',
    },
    {
      component: 'InputNumber',
      fieldName: 'cbm',
      label: $t('airExport.export.cbm'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        ...weightVolumeInputNumberProps,
      },
      formItemClass: 'cargo-metrics-item cargo-metrics-item--cbm',
    },
    {
      component: 'InputNumber',
      fieldName: 'bubbleRatio',
      label: $t('airExport.export.bubbleRatio'),
      help: $t('airExport.export.bubbleRatioTip'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: AIR_DECIMAL_PRECISION,
      },
      formItemClass: 'cargo-metrics-item cargo-metrics-item--bubble-ratio',
    },
    {
      component: 'Textarea',
      fieldName: 'internalRemark',
      label: `${$t('airExport.export.internalRemark')}(仅内部可见)`,
      componentProps: {
        allowClear: true,
        rows: 3,
        maxlength: 1024,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('airExport.export.remark'),
      componentProps: {
        allowClear: true,
        rows: 3,
        maxlength: 1024,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
  ];
}
