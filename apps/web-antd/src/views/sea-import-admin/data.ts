import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { getItemsByName } from '#/api/system/enum-admin';
import { $t } from '#/locales';
import { toEnglishUpperCase } from '#/utils/english-upper-case';
import { getEnumItems } from '#/utils/init-enum';

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

/** 转站日期默认偏移：到港日期 + 6 天 */
export const TRANSFER_STATION_DATE_OFFSET_DAYS = 6;

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
    label: $t('seaImport.import.cargoTypeOptions.normal'),
  },
  {
    value: CARGO_TYPE.R,
    label: $t('seaImport.import.cargoTypeOptions.refrigerated'),
  },
  {
    value: CARGO_TYPE.D,
    label: $t('seaImport.import.cargoTypeOptions.dangerous'),
  },
  {
    value: CARGO_TYPE.O,
    label: $t('seaImport.import.cargoTypeOptions.outOfGauge'),
  },
];

/** 冻柜温度单位（后端仅存 int?，含义由前端维护） */
export const getReeferTemperatureUnitOptions = () => [
  { value: 0, label: '℃' },
  { value: 1, label: '℉' },
];

/**
 * 贸易方式：枚举中心 `/system/enumeration` 的 `TradeMode`。
 * 后端只存整数、不校验、不参与逻辑；文案与取值以后台子项为准。
 * 建议子项：0 一般贸易、1 保税区、2 物流园、3 来料加工、4 进料加工、5 转关、6 一日游、7 其他。
 */
export const TRADE_MODE_ENUM_NAME = 'TradeMode';

let tradeModeOptions: Array<{ label: string; value: number }> = [];

function mapTradeModeItems(
  items: Array<{
    displayName?: string;
    enable?: boolean;
    value: number;
  }>,
) {
  return items
    .filter((item) => item.enable !== false)
    .map((item) => ({
      value: Number(item.value),
      label: item.displayName || String(item.value),
    }))
    .filter((item) => !Number.isNaN(item.value))
    .sort((a, b) => a.value - b.value);
}

export async function loadTradeModeOptions() {
  try {
    const items = await getItemsByName(TRADE_MODE_ENUM_NAME, { silent: true });
    tradeModeOptions = mapTradeModeItems(items ?? []);
  } catch {
    tradeModeOptions = mapTradeModeItems(
      await getEnumItems(TRADE_MODE_ENUM_NAME, false),
    );
  }
  return tradeModeOptions;
}

void loadTradeModeOptions();

export const getTradeModeOptions = () => tradeModeOptions;

export const getTradeModeSelectComponentProps = () => ({
  allowClear: true,
  class: 'w-full',
  options: getTradeModeOptions(),
  placeholder: $t('ui.placeholder.select'),
});

const resolveTradeModeLabel = (value: null | number | undefined) => {
  if (value === null || value === undefined) return '';
  return (
    getTradeModeOptions().find((item) => item.value === value)?.label ??
    String(value)
  );
};

/** 费用状态：与费用模块口径一致，列表用于渲染应收/应付状态列 */
export const getSeaImportFeeStatusOptions = () => [
  { value: 0, label: '录入状态', color: '#b8cdd7' },
  { value: 1, label: '提交审核', color: '#ffc107' },
  { value: 2, label: '审核通过', color: '#67c23a' },
  { value: 3, label: '部分结算', color: '#87ceeb' },
  { value: 4, label: '结算完毕', color: '#409eff' },
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

/** 危险品申报表单 schema（cargoId = 危险品 时展示） */
export function useDgFormSchema(): VbenFormSchema[] {
  const inputProps = cargoExtensionInputProps();
  return [
    {
      component: 'Input',
      fieldName: 'dgLevel',
      label: $t('seaImport.import.dgLevel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgNo',
      label: $t('seaImport.import.dgNo'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPageNo',
      label: $t('seaImport.import.dgPageNo'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgLabel',
      label: $t('seaImport.import.dgLabel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPackingCategory',
      label: $t('seaImport.import.dgPackingCategory'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgContact',
      label: $t('seaImport.import.dgContact'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgTel',
      label: $t('seaImport.import.dgTel'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgNetWeight',
      label: $t('seaImport.import.dgNetWeight'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgFlashPoint',
      label: $t('seaImport.import.dgFlashPoint'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'dgPackingNo',
      label: $t('seaImport.import.dgPackingNo'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'dgMarinePollution',
      label: $t('seaImport.import.dgMarinePollution'),
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
      label: $t('seaImport.import.reeferTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'reeferTemperatureUnit',
      label: $t('seaImport.import.reeferTemperatureUnit'),
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
      label: $t('seaImport.import.reeferMinTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferMaxTemperature',
      label: $t('seaImport.import.reeferMaxTemperature'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferVentilation',
      label: $t('seaImport.import.reeferVentilation'),
      componentProps: inputProps,
    },
    {
      component: 'Input',
      fieldName: 'reeferHumidity',
      label: $t('seaImport.import.reeferHumidity'),
      componentProps: inputProps,
    },
    {
      component: 'Select',
      fieldName: 'reeferVentOpen',
      label: $t('seaImport.import.reeferVentOpen'),
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
  orderUsers: SeaImportAdminApi.OrderUserDto[] | undefined,
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

/**
 * 列表搜索表单 schema。
 * 字段名即接口入参名（首字母大写），无需在 list.vue 里再做映射。
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'TrimInput',
      fieldName: 'Keyword',
      label: $t('seaImport.import.keyword'),
      componentProps: {
        placeholder: $t('seaImport.import.keywordPlaceholder'),
        allowClear: true,
        class: 'sea-import-keyword-input',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: $t('seaImport.import.arrivalDate'),
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
      label: $t('seaImport.import.accountDate'),
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
      label: $t('seaImport.import.clientId'),
    }),
    {
      component: 'PortSelect',
      fieldName: 'POLId',
      label: $t('seaImport.import.polId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        labelKey: 'ediCode',
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'PODId',
      label: $t('seaImport.import.podId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
        labelKey: 'ediCode',
      },
    },
    {
      component: 'CountrySelect',
      fieldName: 'OriginCountryId',
      label: $t('seaImport.import.originCountryId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'Vessel',
      label: $t('seaImport.import.vessel'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'InnerVoyno',
      label: $t('seaImport.import.innerVoyno'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'CarrierId',
      label: $t('seaImport.import.carrierId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'MblNum',
      label: $t('seaImport.import.mblNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ContractNum',
      label: $t('seaImport.import.contractNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'InvoiceNum',
      label: $t('seaImport.import.invoiceNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'BatchNum',
      label: $t('seaImport.import.batchNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'HblNum',
      label: $t('seaImport.import.hblNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ThroughBillNum',
      label: $t('seaImport.import.throughBillNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'TradeMode',
      label: $t('seaImport.import.tradeMode'),
      componentProps: () => getTradeModeSelectComponentProps(),
    },
    {
      component: 'Input',
      fieldName: 'ClientNum',
      label: $t('seaImport.import.clientNum'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    createClientSelectSchema({
      fieldName: 'TerminalId',
      industryCategory: 't',
      label: $t('seaImport.import.terminal'),
    }),
    {
      component: 'Input',
      fieldName: 'CtnNo',
      label: $t('seaImport.import.ctnNo'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'ExchangeBillDateRange',
      label: $t('seaImport.import.exchangeBillDate'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'PickUpDateRange',
      label: $t('seaImport.import.pickUpDate'),
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
      label: $t('seaImport.import.customsDeclareDate'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'TransferStationDateRange',
      label: $t('seaImport.import.transferStationDate'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'CtnUseDateRange',
      label: $t('seaImport.import.ctnUseDate'),
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
      label: $t('seaImport.import.organizationUnits'),
      componentProps: {
        allowClear: true,
        isCompany: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    createClientSelectSchema({
      fieldName: 'TeamId',
      industryCategory: 'i',
      label: $t('seaImport.import.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'CustBrokerId',
      industryCategory: 'f',
      label: $t('seaImport.import.custBrokerId'),
    }),
    createClientSelectSchema({
      fieldName: 'WarehouseId',
      industryCategory: 'q',
      label: $t('seaImport.import.warehouseId'),
    }),
    {
      component: 'Select',
      fieldName: 'CargoId',
      label: $t('seaImport.import.cargoId'),
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
      label: $t('seaImport.import.goodsDes'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'CodeSourceId',
      label: $t('seaImport.import.codeSourceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeServiceSelect',
      fieldName: 'CodeServiceId',
      label: $t('seaImport.import.codeServiceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'InternalRemark',
      label: $t('seaImport.import.internalRemark'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'FeeLocked',
      label: $t('seaImport.import.isFeeLocking'),
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
      label: $t('seaImport.import.isBusinessLocking'),
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
      label: $t('seaImport.import.isUnfinished'),
      componentProps: {
        allowClear: true,
        options: [
          { value: true, label: $t('seaImport.import.unfinished') },
          { value: false, label: $t('seaImport.import.finished') },
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
export const SEA_IMPORT_SORT_FIELD_MAP: Record<string, string> = {
  'transportOrder.clientName': 'TransportOrder.Client.Name',
  'transportOrder.codeSourceName': 'TransportOrder.CodeSource.CnName',
  'transportOrder.codeServiceName': 'TransportOrder.CodeService.CnName',
  carrierCode: 'Carrier.CnName',
  polName: 'POL.PortName',
  podName: 'POD.PortName',
  laneName: 'POL.Lane.LaneName',
  countryName: 'POL.Country.CountryName',
  originCountryName: 'OriginCountry.CountryName',
};

/**
 * 列表列配置（无操作列，第一列为 checkbox 多选列）
 */
export function useColumns(): VxeTableGridOptions<SeaImportAdminApi.SeaImportDto>['columns'] {
  return [
    {
      type: 'checkbox',
      width: 48,
      fixed: 'left',
      align: 'center',
    },
    {
      field: 'transportOrder.commissionNum',
      title: $t('seaImport.import.commissionNum'),
      minWidth: 140,
    },
    {
      field: 'transportOrder.mblNum',
      title: $t('seaImport.import.mblNum'),
      minWidth: 160,
      showOverflow: true,
      // 有运踪异常预警时，在单号前展示黄色叹号（悬停看原因）
      slots: { default: 'mblNum' },
    },
    {
      field: 'feituoTrackStatus',
      title: $t('tracking.trackStatusColumn'),
      minWidth: 130,
      sortable: false,
      slots: { default: 'feituoTrackStatus' },
    },
    {
      field: 'hblNum',
      title: $t('seaImport.import.hblNum'),
      minWidth: 130,
      showOverflow: true,
    },
    {
      field: 'throughBillNum',
      title: $t('seaImport.import.throughBillNum'),
      minWidth: 130,
      showOverflow: true,
    },
    {
      field: 'transportOrder.contractNum',
      title: $t('seaImport.import.contractNum'),
      minWidth: 130,
      showOverflow: true,
    },
    {
      field: 'invoiceNum',
      title: $t('seaImport.import.invoiceNum'),
      minWidth: 130,
      showOverflow: true,
    },
    {
      field: 'batchNum',
      title: $t('seaImport.import.batchNum'),
      minWidth: 120,
      showOverflow: true,
    },
    {
      field: 'transportOrder.etd',
      title: $t('seaImport.import.arrivalDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.clientName',
      title: $t('seaImport.import.clientId'),
      minWidth: 150,
      showOverflow: true,
      formatter: ({ row }) => row.transportOrder?.client?.name ?? '',
    },
    {
      field: 'carrierCode',
      title: $t('seaImport.import.carrierId'),
      minWidth: 110,
      slots: { default: 'carrierWithLogo' },
    },
    {
      field: 'polName',
      title: $t('seaImport.import.polId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.pol?.portName ?? '',
    },
    {
      field: 'podName',
      title: $t('seaImport.import.podId'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.pod?.portName ?? '',
    },
    {
      field: 'vessel',
      title: $t('seaImport.import.vessel'),
      minWidth: 120,
      showOverflow: true,
    },
    {
      field: 'innerVoyno',
      title: $t('seaImport.import.innerVoyno'),
      minWidth: 100,
      showOverflow: true,
    },
    {
      field: 'laneName',
      title: $t('seaImport.import.laneName'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.pol?.lane?.laneName ?? '',
    },
    {
      field: 'countryName',
      title: $t('seaImport.import.countryName'),
      minWidth: 110,
      showOverflow: true,
      formatter: ({ row }) => row.pol?.country?.countryName ?? '',
    },
    {
      field: 'originCountryName',
      title: $t('seaImport.import.originCountryId'),
      minWidth: 110,
      showOverflow: true,
      formatter: ({ row }) => row.originCountry?.countryName ?? '',
    },
    {
      field: 'terminal.name',
      title: $t('seaImport.import.terminal'),
      minWidth: 120,
      showOverflow: true,
      formatter: ({ row }) => row.terminal?.name ?? '',
    },
    {
      field: 'tradeMode',
      title: $t('seaImport.import.tradeMode'),
      minWidth: 110,
      formatter: ({ row }) => resolveTradeModeLabel(row.tradeMode),
    },
    {
      field: 'clientNum',
      title: $t('seaImport.import.clientNum'),
      minWidth: 110,
      showOverflow: true,
    },
    {
      field: 'transportOrder.codeSourceName',
      title: $t('seaImport.import.codeSourceId'),
      minWidth: 110,
      showOverflow: true,
      formatter: ({ row }) =>
        row.transportOrder?.codeSourceName ||
        row.transportOrder?.codeSource?.cnName ||
        '',
    },
    {
      field: 'transportOrder.codeServiceName',
      title: $t('seaImport.import.codeServiceId'),
      minWidth: 110,
      showOverflow: true,
      formatter: ({ row }) =>
        row.transportOrder?.codeServiceName ||
        row.transportOrder?.codeService?.cnName ||
        '',
    },
    {
      field: 'transportOrder.totalCtn',
      title: $t('seaImport.import.orderCtns'),
      minWidth: 130,
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
      showOverflow: true,
      formatter: ({ row }) =>
        getRoleName(row.transportOrder?.orderUsers, USER_ATTRIBUTE.operation),
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
      title: $t('seaImport.import.organizationUnits'),
      minWidth: 140,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) => row.orgs?.[0]?.name || '',
    },
    {
      field: 'transportOrder.accountDate',
      title: $t('seaImport.import.accountDate'),
      minWidth: 110,
      formatter: ({ row }) => formatMonth(row.transportOrder?.accountDate),
    },
    {
      field: 'transportOrder.shipperName',
      title: $t('seaImport.import.shipperId'),
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
      title: $t('seaImport.import.consigneeId'),
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
      title: $t('seaImport.import.notifierId'),
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
      field: 'transportOrder.pkgs',
      title: $t('seaImport.import.pkgs'),
      minWidth: 90,
    },
    {
      field: 'transportOrder.codePackageName',
      title: $t('seaImport.import.codePackageId'),
      minWidth: 100,
      sortable: false,
      showOverflow: true,
      formatter: ({ row }) =>
        row.transportOrder?.codePackageName ||
        row.transportOrder?.codePackage?.name ||
        '',
    },
    {
      field: 'transportOrder.kgs',
      title: $t('seaImport.import.kgs'),
      minWidth: 100,
    },
    {
      field: 'totalNetWeight',
      title: $t('seaImport.import.totalNetWeight'),
      minWidth: 110,
    },
    {
      field: 'transportOrder.cbm',
      title: $t('seaImport.import.cbm'),
      minWidth: 100,
    },
    {
      field: 'transportOrder.marks',
      title: $t('seaImport.import.marks'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.goodsDes',
      title: $t('seaImport.import.goodsDes'),
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'transportOrder.internalRemark',
      title: $t('seaImport.import.internalRemark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'transportOrder.remark',
      title: $t('seaImport.import.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'exchangeBillDate',
      title: $t('seaImport.import.exchangeBillDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'pickUpDate',
      title: $t('seaImport.import.pickUpDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'customsDeclareDate',
      title: $t('seaImport.import.customsDeclareDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'transferStationDate',
      title: $t('seaImport.import.transferStationDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'freeDays',
      title: $t('seaImport.import.freeDays'),
      minWidth: 90,
    },
    {
      field: 'ctnUseDate',
      title: $t('seaImport.import.ctnUseDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'transportOrder.feeLocked',
      title: $t('seaImport.import.isFeeLocking'),
      minWidth: 90,
      align: 'center',
      slots: { default: 'feeLocked' },
    },
    {
      field: 'transportOrder.isBusinessLocking',
      title: $t('seaImport.import.isBusinessLocking'),
      minWidth: 90,
      align: 'center',
      slots: { default: 'businessLocked' },
    },
    {
      field: 'transportOrder.isUnfinished',
      title: $t('seaImport.import.isUnfinished'),
      minWidth: 100,
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: [
          {
            value: true,
            label: $t('seaImport.import.unfinished'),
            color: 'warning',
          },
          {
            value: false,
            label: $t('seaImport.import.finished'),
            color: 'success',
          },
        ],
      },
    },
    {
      field: 'receiveFeeStatus',
      title: $t('seaImport.import.receiveFeeStatus'),
      minWidth: 110,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getSeaImportFeeStatusOptions(),
      },
    },
    {
      field: 'payFeeStatus',
      title: $t('seaImport.import.payFeeStatus'),
      minWidth: 110,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getSeaImportFeeStatusOptions(),
      },
    },
    {
      field: 'creatorUserNickName',
      title: $t('seaImport.import.creatorUserNickName'),
      minWidth: 120,
      sortable: false,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('seaImport.import.creationTime'),
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
      label: $t('seaImport.import.commissionNum'),
      componentProps: {
        disabled: true,
        placeholder: isEdit
          ? ''
          : $t('seaImport.import.commissionNumAutoGenerate'),
      },
    },
    {
      // 归属组织实际交互在基础信息头部（按销售绑定组织的 UserOrgSelect）渲染，
      // 此处仅作隐藏的表单值载体，保留必填校验。
      component: 'UserOrgSelect',
      fieldName: 'orgId',
      label: $t('seaImport.import.organizationUnits'),
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
      label: $t('seaImport.import.countryName'),
      componentProps: { disabled: true, placeholder: '自动关联' },
    },
    {
      component: 'Input',
      fieldName: 'laneName',
      label: $t('seaImport.import.laneName'),
      componentProps: { disabled: true, placeholder: '自动关联' },
    },
    {
      component: 'DatePicker',
      fieldName: 'accountDate',
      label: $t('seaImport.import.accountDate'),
      componentProps: {
        class: 'w-full',
        picker: 'month',
        disabled: true,
        placeholder: isEdit
          ? undefined
          : $t('seaImport.import.commissionNumAutoGenerate'),
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'settlementDate',
      label: $t('seaImport.import.settlementDate'),
      componentProps: {
        class: 'w-full',
        disabled: true,
        placeholder: isEdit
          ? undefined
          : $t('seaImport.import.commissionNumAutoGenerate'),
      },
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceId',
      label: $t('seaImport.import.codeSourceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CodeServiceSelect',
      fieldName: 'codeServiceId',
      label: $t('seaImport.import.codeServiceId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'CountrySelect',
      fieldName: 'originCountryId',
      label: $t('seaImport.import.originCountryId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'cargoId',
      label: $t('seaImport.import.cargoId'),
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
      label: $t('seaImport.import.mblNum'),
      componentProps: { allowClear: true, maxlength: 64 },
    },
    {
      component: 'Input',
      fieldName: 'hblNum',
      label: $t('seaImport.import.hblNum'),
      componentProps: { allowClear: true, maxlength: 32 },
    },
    {
      component: 'Input',
      fieldName: 'throughBillNum',
      label: $t('seaImport.import.throughBillNum'),
      componentProps: { allowClear: true, maxlength: 32 },
    },
    {
      component: 'Input',
      fieldName: 'contractNum',
      label: $t('seaImport.import.contractNum'),
      componentProps: { allowClear: true, maxlength: 64 },
    },
    {
      component: 'Input',
      fieldName: 'invoiceNum',
      label: $t('seaImport.import.invoiceNum'),
      componentProps: { allowClear: true, maxlength: 64 },
    },
    {
      component: 'Input',
      fieldName: 'batchNum',
      label: $t('seaImport.import.batchNum'),
      componentProps: { allowClear: true, maxlength: 64 },
    },
    {
      component: 'Input',
      fieldName: 'clientNum',
      label: $t('seaImport.import.clientNum'),
      componentProps: { allowClear: true, maxlength: 32 },
    },
    createClientSelectSchema({
      fieldName: 'terminalId',
      industryCategory: 't',
      label: $t('seaImport.import.terminal'),
    }),
    {
      component: 'Select',
      fieldName: 'tradeMode',
      label: $t('seaImport.import.tradeMode'),
      componentProps: () => getTradeModeSelectComponentProps(),
    },
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: $t('seaImport.import.clientId'),
      rules: 'selectRequired',
    }),
    createClientSelectSchema({
      fieldName: 'teamId',
      industryCategory: 'i',
      label: $t('seaImport.import.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'custBrokerId',
      industryCategory: 'f',
      label: $t('seaImport.import.custBrokerId'),
    }),
    createClientSelectSchema({
      fieldName: 'warehouseId',
      industryCategory: 'q',
      label: $t('seaImport.import.warehouseId'),
    }),
    createClientSelectSchema({
      fieldName: 'insuranceId',
      industryCategory: 'r',
      label: $t('seaImport.import.insuranceId'),
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
  // 三个下拉排一行，三段内容排下一行，与提单抬头的阅读顺序一致
  return [
    {
      // 干系人交互在右侧面板，这里只做表单值载体，便于统一取值与脏检查
      component: 'OrderUsersButton',
      fieldName: 'orderUsers',
      label: $t('seaImport.import.orderUsers'),
      formItemClass: 'party-flow-order-users-hidden',
    },
    createClientSelectSchema({
      fieldName: 'shipperId',
      industryCategory: 'b',
      label: $t('seaImport.import.shipperId'),
      formItemClass: 'party-flow-item party-flow-pos--1',
    }),
    createClientSelectSchema({
      fieldName: 'consigneeId',
      industryCategory: 'e',
      label: $t('seaImport.import.consigneeId'),
      formItemClass: 'party-flow-item party-flow-pos--2',
    }),
    createClientSelectSchema({
      fieldName: 'notifierId',
      industryCategory: 'h',
      label: $t('seaImport.import.notifierId'),
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
 * 船期与进口作业日期 schema。
 * 到港日期落在 `transportOrder.etd`；转站日期/箱使日期有默认推算，见 use-sea-import-dates。
 */
export function useShipmentFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'VesselVoyageInput',
      fieldName: 'vessel',
      label: $t('seaImport.import.vesselVoyage'),
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
      label: $t('seaImport.import.carrierId'),
      componentProps: {
        placeholder: $t('ui.placeholder.select'),
        allowClear: true,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'freeDays',
      label: $t('seaImport.import.freeDays'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 0,
        addonAfter: $t('seaImport.import.freeDaysUnit'),
      },
    },
    // 以下日期按进口作业顺序排成流程条：到港 → 换单 → 提货 → 报关 → 转站 → 箱使
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: $t('seaImport.import.arrivalDate'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--1',
    },
    {
      component: 'DatePicker',
      fieldName: 'exchangeBillDate',
      label: $t('seaImport.import.exchangeBillDate'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--2',
    },
    {
      component: 'DatePicker',
      fieldName: 'pickUpDate',
      label: $t('seaImport.import.pickUpDate'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--3',
    },
    {
      component: 'DatePicker',
      fieldName: 'customsDeclareDate',
      label: $t('seaImport.import.customsDeclareDate'),
      componentProps: DATE_ONLY_PICKER_PROPS,
      formItemClass: 'shipment-time-item shipment-time-pos--4',
    },
    {
      // 由到港日期推算，只读文本展示（非日期选择器，不用 disabled 以免发灰看不清）
      component: 'Input',
      fieldName: 'transferStationDate',
      label: $t('seaImport.import.transferStationDate'),
      help: $t('seaImport.import.transferStationDateTip'),
      componentProps: {
        readonly: true,
        placeholder: $t('seaImport.import.autoCalculatePlaceholder'),
        class: 'w-full !cursor-default !bg-white !text-[rgba(0,0,0,0.88)]',
      },
      formItemClass: 'shipment-time-item shipment-time-pos--5',
    },
    {
      // 由到港日期与免箱期推算，只读文本展示（非日期选择器，不用 disabled 以免发灰看不清）
      component: 'Input',
      fieldName: 'ctnUseDate',
      label: $t('seaImport.import.ctnUseDate'),
      help: $t('seaImport.import.ctnUseDateTip'),
      componentProps: {
        readonly: true,
        placeholder: $t('seaImport.import.autoCalculatePlaceholder'),
        class: 'w-full !cursor-default !bg-white !text-[rgba(0,0,0,0.88)]',
      },
      formItemClass:
        'shipment-time-item shipment-time-item--last shipment-time-pos--6',
    },
  ];
}

/** 港口表单项扩展：`PortSelect` 的 `@change` 含 `option.raw`，由业务层联动备注等 */
export type PortFormSchemaOptions = {
  onPortChange?: (fieldName: string, value: unknown, option: unknown) => void;
};

/** PortSelect 的 `option` 可能是数组（多选）或单个对象 */
export function pickPortSelectOption(option: unknown) {
  const target = Array.isArray(option) ? option[0] : option;
  return target as
    | {
        raw?: {
          country?: { countryEnName?: string };
          portName?: string;
        };
      }
    | undefined;
}

/** 备注单段：去掉中文逗号及逗号后内容，避免与 country 重复拼接 */
function normalizePortRemarkPart(value: unknown) {
  return (
    (value ?? '').toString().replace(/，/g, ',').split(',')[0]?.trim() ?? ''
  );
}

/** 备注格式：portName, countryEnName（英文逗号 + 空格，联动时同步半角与大写） */
export function formatSeaImportPortRemark(raw?: {
  country?: { countryEnName?: string };
  portName?: string;
}) {
  const portName = normalizePortRemarkPart(raw?.portName);
  const countryEnName = normalizePortRemarkPart(raw?.country?.countryEnName);
  const remark =
    portName && countryEnName
      ? `${portName}, ${countryEnName}`
      : portName || countryEnName || '';
  return remark ? toEnglishUpperCase(remark) : undefined;
}

export function buildPortSelectProps(
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
 * 港口信息表单 schema。
 * 进口只有起运港 / 目的港两个节点；原产国是整票属性，放在基础信息的运输条款之后。
 */
export function usePortFormSchema(
  options?: PortFormSchemaOptions,
): VbenFormSchema[] {
  const { onPortChange } = options ?? {};
  return [
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('seaImport.import.polId'),
      componentProps: buildPortSelectProps('polId', onPortChange),
      formItemClass: 'port-flow-item port-flow-pos--pol',
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: $t('seaImport.import.podId'),
      componentProps: buildPortSelectProps('podId', onPortChange),
      formItemClass: 'port-flow-item port-flow-item--last port-flow-pos--pod',
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
      fieldName: 'podRemark',
      label: '',
      componentProps: { allowClear: true, rows: 1 },
      formItemClass: 'port-flow-remark port-flow-pos--pod-remark',
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
      label: $t('seaImport.import.orderCodeGoodss'),
      componentProps: {
        mode: 'multiple',
        showNameWithHsCode: true,
        placeholder: $t('seaImport.import.pleaseSelectGoods'),
        allowClear: true,
      },
      formItemClass: 'col-span-2',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'marks',
      label: $t('seaImport.import.marks'),
      componentProps: { allowClear: true, rows: 7 },
      formItemClass: 'col-span-2 cargo-main-item cargo-main-item--marks',
    },
    {
      component: 'EnglishUpperTextarea',
      fieldName: 'goodsDes',
      label: $t('seaImport.import.goodsDes'),
      componentProps: { allowClear: true, rows: 7 },
      formItemClass: 'col-span-3 cargo-main-item cargo-main-item--goods-des',
    },
    {
      component: 'PkgsPackageInput',
      fieldName: 'pkgs',
      label: $t('seaImport.import.pkgsPackage'),
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
      label: $t('seaImport.import.kgs'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 2,
      },
      formItemClass: 'cargo-metrics-item cargo-metrics-item--kgs',
    },
    {
      component: 'InputNumber',
      fieldName: 'totalNetWeight',
      label: $t('seaImport.import.totalNetWeight'),
      help: $t('seaImport.import.calcTotalNetWeightTip'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 2,
      },
      formItemClass: 'cargo-metrics-item cargo-metrics-item--total-net-weight',
    },
    {
      component: 'InputNumber',
      fieldName: 'cbm',
      label: $t('seaImport.import.cbm'),
      componentProps: {
        class: 'w-full',
        min: 0,
        controls: false,
        precision: 2,
      },
      formItemClass: 'cargo-metrics-item cargo-metrics-item--cbm',
    },
    {
      component: 'Textarea',
      fieldName: 'internalRemark',
      label: `${$t('seaImport.import.internalRemark')}(仅内部可见)`,
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
      label: $t('seaImport.import.externalRemark'),
      componentProps: {
        allowClear: true,
        rows: 3,
        style: { minHeight: '110px' },
      },
      formItemClass: 'col-span-3',
    },
  ];
}

/**
 * 港口与货物信息表单 schema（合并：港口信息 + 货物信息）
 * 注意：箱型由 OrderCtnTable 组件单独渲染
 */
export function usePortCargoFormSchema(
  options?: PortFormSchemaOptions,
): VbenFormSchema[] {
  return [...usePortFormSchema(options), ...useCargoFormSchema()];
}
