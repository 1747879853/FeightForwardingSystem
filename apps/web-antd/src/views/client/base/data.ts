import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import { getCargoTypeOptions } from '#/views/sea-export-admin/data';
import { $t } from '#/locales';

/** 客户性质枚举选项 */
const getClientTypeOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.clientTypeOptions.direct'),
    color: 'processing',
  },
  {
    value: 1,
    label: $t('seaExport.client.clientTypeOptions.peer'),
    color: 'warning',
  },
  {
    value: 2,
    label: $t('seaExport.client.clientTypeOptions.supplier'),
    color: 'success',
  },
];

/** 客户等级枚举选项 */
const getClientLevelOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.clientLevelOptions.vip1'),
    color: 'warning',
  },
  {
    value: 2,
    label: $t('seaExport.client.clientLevelOptions.A'),
    color: 'success',
  },
  {
    value: 3,
    label: $t('seaExport.client.clientLevelOptions.B'),
    color: 'warning',
  },
  {
    value: 4,
    label: $t('seaExport.client.clientLevelOptions.C'),
    color: 'success',
  },
];

/** 供应商资质等级枚举选项 */
const getSupplierLevelOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.supplierLevelOptions.level1'),
    color: 'warning',
  },
  {
    value: 2,
    label: $t('seaExport.client.supplierLevelOptions.level2'),
    color: 'success',
  },
  {
    value: 3,
    label: $t('seaExport.client.supplierLevelOptions.level3'),
    color: 'warning',
  },
];
/** 客户来源枚举选项 */
const getClientSourceOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.sourceOptions.oldCustomerReferral'),
  },
  {
    value: 2,
    label: $t('seaExport.client.sourceOptions.onlineMarketing'),
  },
  {
    value: 3,
    label: $t('seaExport.client.sourceOptions.exhibition'),
  },
  {
    value: 4,
    label: $t('seaExport.client.sourceOptions.socialMedia'),
  },
  {
    value: 5,
    label: $t('seaExport.client.sourceOptions.searchEngine'),
  },
  {
    value: 6,
    label: $t('seaExport.client.sourceOptions.phoneInquiry'),
  },
  {
    value: 7,
    label: $t('seaExport.client.sourceOptions.emailContact'),
  },
  {
    value: 8,
    label: $t('seaExport.client.sourceOptions.industryRecommendation'),
  },
  {
    value: 9,
    label: $t('seaExport.client.sourceOptions.other'),
  },
];

/** 优质航线来源枚举选项 */
const getLaneIdOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.laneOptions.asia'),
  },
  {
    value: 2,
    label: $t('seaExport.client.laneOptions.america'),
  },
  {
    value: 3,
    label: $t('seaExport.client.laneOptions.europe'),
  },
  {
    value: 4,
    label: $t('seaExport.client.laneOptions.oceania'),
  },
  {
    value: 5,
    label: $t('seaExport.client.laneOptions.mideast'),
  },
  {
    value: 6,
    label: $t('seaExport.client.laneOptions.africa'),
  },
];

/** 行业类别枚举选项（value 取字母，与 IndustryCategory 注释对应：a 船公司、b 发货人、c 场站…） */
const getIndustryCategoryOptions = () => [
  {
    key: 1,
    value: 'a',
    label: $t('seaExport.client.industryCategoryOptions.shipCompany'),
    module: [],
  },
  {
    key: 2,
    value: 'b',
    label: $t('seaExport.client.industryCategoryOptions.shipper'),
  },
  {
    key: 3,
    value: 'c',
    label: $t('seaExport.client.industryCategoryOptions.terminal'),
  },
  {
    key: 4,
    value: 'd',
    label: $t('seaExport.client.industryCategoryOptions.airline'),
  },
  {
    key: 5,
    value: 'e',
    label: $t('seaExport.client.industryCategoryOptions.consignee'),
  },
  {
    key: 6,
    value: 'f',
    label: $t('seaExport.client.industryCategoryOptions.customsBroker'),
  },
  {
    key: 7,
    value: 'g',
    label: $t('seaExport.client.industryCategoryOptions.expressCompany'),
  },
  {
    key: 8,
    value: 'h',
    label: $t('seaExport.client.industryCategoryOptions.notifyParty'),
  },
  {
    key: 9,
    value: 'i',
    label: $t('seaExport.client.industryCategoryOptions.fleet'),
  },
  {
    key: 10,
    value: 'j',
    label: $t('seaExport.client.industryCategoryOptions.trader'),
  },
  {
    key: 11,
    value: 'k',
    label: $t('seaExport.client.industryCategoryOptions.agent'),
  },
  {
    key: 12,
    value: 'l',
    label: $t('seaExport.client.industryCategoryOptions.other'),
  },
  {
    key: 13,
    value: 'm',
    label: $t('seaExport.client.industryCategoryOptions.supplier'),
  },
  {
    key: 14,
    value: 'n',
    label: $t('seaExport.client.industryCategoryOptions.shippingAgent'),
  },
  {
    key: 15,
    value: 'o',
    label: $t('seaExport.client.industryCategoryOptions.bookingAgent'),
  },
  {
    key: 16,
    value: 'p',
    label: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
  },
  {
    key: 17,
    value: 'q',
    label: $t('seaExport.client.industryCategoryOptions.warehouse'),
  },
  {
    key: 18,
    value: 'r',
    label: $t('seaExport.client.industryCategoryOptions.insuranceCompany'),
  },
  {
    key: 19,
    value: 's',
    label: $t('seaExport.client.industryCategoryOptions.destinationAgent'),
  },
  {
    key: 20,
    value: 'u',
    label: $t('seaExport.client.industryCategoryOptions.factory'),
  },
];

const getCustomerIndustryCategoryOptions = () => [
  {
    key: 1,
    value: 'a',
    label: $t('seaExport.client.industryCategoryOptions.shipCompany'),
    module: [],
  },
  {
    key: 2,
    value: 'b',
    label: $t('seaExport.client.industryCategoryOptions.shipper'),
  },
  {
    key: 16,
    value: 'p',
    label: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
  },
  {
    key: 11,
    value: 'k',
    label: $t('seaExport.client.industryCategoryOptions.agent'),
  },
];

const getSupplierIndustryCategoryOptions = () => [
  {
    key: 3,
    value: 'c',
    label: $t('seaExport.client.industryCategoryOptions.terminal'),
  },
  {
    key: 4,
    value: 'd',
    label: $t('seaExport.client.industryCategoryOptions.airline'),
  },
  {
    key: 5,
    value: 'e',
    label: $t('seaExport.client.industryCategoryOptions.consignee'),
  },
  {
    key: 6,
    value: 'f',
    label: $t('seaExport.client.industryCategoryOptions.customsBroker'),
  },
  {
    key: 7,
    value: 'g',
    label: $t('seaExport.client.industryCategoryOptions.expressCompany'),
  },

  {
    key: 9,
    value: 'i',
    label: $t('seaExport.client.industryCategoryOptions.fleet'),
  },

  {
    key: 14,
    value: 'n',
    label: $t('seaExport.client.industryCategoryOptions.shippingAgent'),
  },
  {
    key: 15,
    value: 'o',
    label: $t('seaExport.client.industryCategoryOptions.bookingAgent'),
  },

  {
    key: 17,
    value: 'q',
    label: $t('seaExport.client.industryCategoryOptions.warehouse'),
  },
  {
    key: 18,
    value: 'r',
    label: $t('seaExport.client.industryCategoryOptions.insuranceCompany'),
  },
  {
    key: 19,
    value: 's',
    label: $t('seaExport.client.industryCategoryOptions.destinationAgent'),
  },
  {
    key: 20,
    value: 'u',
    label: $t('seaExport.client.industryCategoryOptions.factory'),
  },
];

/** 是否有效枚举选项 */
const getEnableOptions = () => [
  {
    value: true,
    label: $t('seaExport.client.enableStatus.enabled'),
    color: 'success',
  },
  {
    value: false,
    label: $t('seaExport.client.enableStatus.disabled'),
    color: 'default',
  },
];

/** 是否默认枚举选项 */
const getDefaultOptions = () => [
  {
    value: true,
    label: $t('seaExport.client.addressOptions.isDefaultOptions.yes'),
    color: 'success',
  },
  {
    value: false,
    label: $t('seaExport.client.addressOptions.isDefaultOptions.no'),
    color: 'default',
  },
];

const getCustomerCoopStatusOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.coopStatus.potential', [
      $t('seaExport.client.clientTypeOptions.customer'),
    ]),
  },
  {
    value: 1,
    label: $t('seaExport.client.coopStatus.formal', [
      $t('seaExport.client.clientTypeOptions.customer'),
    ]),
  },
  {
    value: 2,
    label: $t('seaExport.client.coopStatus.suspendCooperation'),
  },
  {
    value: 3,
    label: $t('seaExport.client.coopStatus.blacklist'),
  },
];

const getSupplierCoopStatusOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.coopStatus.potential', [
      $t('seaExport.client.clientTypeOptions.supplier'),
    ]),
  },
  {
    value: 1,
    label: $t('seaExport.client.coopStatus.formal', [
      $t('seaExport.client.clientTypeOptions.supplier'),
    ]),
  },
  {
    value: 2,
    label: $t('seaExport.client.coopStatus.suspendCooperation'),
  },
  {
    value: 3,
    label: $t('seaExport.client.coopStatus.blacklist'),
  },
];

/**
 * 根据行业类别生成客户下拉的表单 schema
 * @param options.fieldName 表单字段名
 * @param options.industryCategory 行业类别，如 'a' 船公司、'b' 发货人
 * @param options.label 表单项标签，默认「客户」
 * @param options.placeholder 占位符
 * @param options.rules 校验规则，如 'required'、'selectRequired'
 */
export function createClientSelectSchema(options: {
  fieldName: string;
  industryCategory: string;
  formItemClass?: string;
  label?: string;
  placeholder?: string;
  rules?: string;
}): VbenFormSchema {
  const {
    fieldName,
    industryCategory,
    formItemClass,
    label = $t('seaExport.client.name'),
    placeholder,
    rules,
  } = options;

  return {
    component: 'ClientSelect',
    fieldName,
    formItemClass,
    label,
    rules,
    componentProps: {
      industryCategory,
      placeholder: placeholder ?? $t('ui.placeholder.select'),
      allowClear: true,
    },
  };
}

/**
 * 将行业类别逗号字符串映射为可读 label
 */
export const formatIndustryCategories = (value?: string): string => {
  if (!value) return '';
  const optionsMap = new Map(
    getIndustryCategoryOptions().map((o) => [o.value, o.label]),
  );
  return value
    .replaceAll(',', '')
    .split('')
    .map((v) => optionsMap.get(v.trim()) || v.trim())
    .filter(Boolean)
    .join(', ');
};

/**
 * 列表页搜索表单 schema
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.client.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'IndustryCategory',
      label: $t('seaExport.client.industryCategories'),
      componentProps: {
        allowClear: true,
        options: getIndustryCategoryOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 新增/编辑表单 schema
 */
export function useBaseFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('seaExport.client.clientName'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'nameInput',
      fieldName: 'fullName',
      label: $t('seaExport.client.fullName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: $t('seaExport.client.code'),
      componentProps: { allowClear: true },
    },

    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('seaExport.client.enName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'taxNo',
      label: $t('seaExport.client.taxNo'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('seaExport.client.phone'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('seaExport.client.email'),
      componentProps: { allowClear: true },
    },

    {
      component: 'Input',
      fieldName: 'url',
      label: $t('seaExport.client.url'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('seaExport.client.remark'),
      componentProps: { allowClear: true, rows: 3 },
    },
  ];
}
export function useBusinessFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'legalPerson',
      label: $t('seaExport.client.legalPerson'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'registeredCapital',
      label: $t('seaExport.client.registeredCapital'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'establishmentDate',
      label: $t('seaExport.client.establishmentDate'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'businessTerm',
      label: $t('seaExport.client.businessTerm'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
  ];
}
export function useClientFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'clientType',
      label: $t('seaExport.client.clientType'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: getClientTypeOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'clientLevel',
      label: $t('seaExport.client.clientLevel'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        options: getClientLevelOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'source',
      label: $t('seaExport.client.source'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        options: getClientSourceOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'cargoType',
      label: $t('seaExport.client.cargoType'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'clientCoopSince',
      label: $t('seaExport.client.clientCoopSince'),
      rules: 'required',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'DatePicker',
      fieldName: 'clientLastTxnTime',
      label: $t('seaExport.client.clientLastTxnTime'),
      rules: 'required',
      componentProps: { allowClear: true, class: 'w-full' },
    },
  ];
}

export function useSupplierFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'supplierLevel',
      label: $t('seaExport.client.supplierLevel'),
      rules: 'required',
      componentProps: {
        allowClear: true,
        options: getSupplierLevelOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Input',
      fieldName: 'yearTeu',
      label: $t('seaExport.client.yearTeu'),
      componentProps: {
        allowClear: true,
        disabled: true,
        defaultValue: '无需填写',
      },
    },
    {
      component: 'Input',
      fieldName: 'yearTicketCount',
      label: $t('seaExport.client.yearTicketCount'),
      componentProps: {
        allowClear: true,
        disabled: true,
        defaultValue: '无需填写',
      },
    },
    {
      component: 'LaneSelect',
      fieldName: 'laneIds',
      label: $t('seaExport.client.laneId'),
      componentProps: {
        // allowClear: true,
        // options: getLaneIdOptions(),
        class: 'w-[199px]',
        placeholder: $t('ui.placeholder.select'),
        mode: 'multiple',
      },
    },
  ];
}
export function useAddressFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('seaExport.client.addressOptions.name'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'address',
      label: $t('seaExport.client.addressOptions.address'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'contactPerson',
      label: $t('seaExport.client.addressOptions.contactPerson'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'mobile',
      label: $t('seaExport.client.addressOptions.mobile'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: $t('seaExport.client.addressOptions.remark'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Checkbox',
      fieldName: 'isDefault',
      label: $t('seaExport.client.addressOptions.isDefault'),
      componentProps: { allowClear: true },
    },
  ];
}

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('seaExport.client.clientName'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: $t('seaExport.client.code'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'fullName',
      label: $t('seaExport.client.fullName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('seaExport.client.enName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('seaExport.client.phone'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'clientType',
      label: $t('seaExport.client.clientType'),
      componentProps: {
        allowClear: true,
        options: getClientTypeOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'CountrySelect',
      fieldName: 'country',
      label: $t('seaExport.client.country'),
      componentProps: {
        valueKey: 'code',
        labelKey: 'countryName',
        allowClear: true,
      },
    },
    {
      component: 'AreaCascader',
      fieldName: 'areaId',
      label: $t('seaExport.client.areaId'),
    },
    {
      component: 'Input',
      fieldName: 'address',
      label: $t('seaExport.client.address'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'enAddress',
      label: $t('seaExport.client.enAddress'),
      componentProps: { allowClear: true },
    },
    // {
    //   component: 'CheckboxGroup',
    //   fieldName: 'industryCategories',
    //   label: $t('seaExport.client.industryCategories'),
    //   componentProps: {
    //     options: getIndustryCategoryOptions().map(({ label, value }) => ({
    //       label,
    //       value,
    //     })),
    //   },
    // },
    {
      component: 'Input',
      fieldName: 'mainProduct',
      label: $t('seaExport.client.mainProduct'),
      componentProps: { allowClear: true, maxlength: 1024 },
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('seaExport.client.enable'),
      defaultValue: true,
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('seaExport.client.remark'),
      componentProps: { allowClear: true, rows: 3 },
    },
  ];
}

/**
 * 表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<ClientAdminApi.ClientDto>,
): VxeTableGridOptions<ClientAdminApi.ClientDto>['columns'] {
  return [
    {
      field: 'name',
      title: $t('seaExport.client.clientName'),
      minWidth: 120,
    },
    {
      field: 'code',
      title: $t('seaExport.client.code'),
      minWidth: 100,
    },
    {
      field: 'fullName',
      title: $t('seaExport.client.fullName'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'phone',
      title: $t('seaExport.client.phone'),
      minWidth: 120,
    },
    {
      field: 'clientType',
      title: $t('seaExport.client.clientType'),
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: getClientTypeOptions(),
      },
    },
    {
      field: 'industryCategories',
      title: $t('seaExport.client.industryCategories'),
      minWidth: 200,
      showOverflow: true,
      formatter: ({ cellValue }) => formatIndustryCategories(cellValue),
    },
    {
      field: 'country',
      title: $t('seaExport.client.country'),
      minWidth: 100,
    },
    {
      field: 'enable',
      title: $t('seaExport.client.enable'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: getEnableOptions(),
      },
    },
    {
      field: 'remark',
      title: $t('seaExport.client.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('seaExport.client.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('seaExport.client.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('seaExport.client.operation'),
      width: 150,
    },
  ];
}

export {
  getClientTypeOptions,
  getEnableOptions,
  getDefaultOptions,
  getIndustryCategoryOptions,
  getCustomerCoopStatusOptions,
  getSupplierCoopStatusOptions,
  getCustomerIndustryCategoryOptions,
  getSupplierIndustryCategoryOptions,
};
