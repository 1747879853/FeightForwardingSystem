import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import { ClientAdminApi } from '#/api/sea-export/client-admin';
import { getCargoTypeOptions } from '#/views/sea-export-admin/data';
import { $t } from '#/locales';

/** 客户类型枚举选项 */
const getClientTypeOptions = () => [
  {
    value: ClientAdminApi.ClientType.Peer,
    label: $t('seaExport.client.clientTypeOptions.peer'),
  },
  {
    value: ClientAdminApi.ClientType.DirectCustomer,
    label: $t('seaExport.client.clientTypeOptions.direct'),
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
    key: 16,
    value: 'p',
    label: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
  },
  {
    key: 2,
    value: 'b',
    label: $t('seaExport.client.industryCategoryOptions.shipper'),
  },
  {
    key: 5,
    value: 'e',
    label: $t('seaExport.client.industryCategoryOptions.consignee'),
  },
  {
    key: 20,
    value: 'u',
    label: $t('seaExport.client.industryCategoryOptions.factory'),
  },
];

const getSupplierIndustryCategoryOptions = () => [
  {
    key: 15,
    value: 'o',
    label: $t('seaExport.client.industryCategoryOptions.bookingAgent'),
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

/** 客户合作状态枚举选项 */
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

/** 供应商合作状态枚举选项 */
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

/** 是否失信枚举选项 */
const getIsDishonestOptions = () => [
  {
    value: true,
    label: $t('seaExport.client.dishonestStatus.dishonest'),
    color: 'error',
  },
  {
    value: false,
    label: $t('seaExport.client.dishonestStatus.honest'),
    color: 'success',
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

/** 地址类型枚举选项 */
export const getAddressTypeOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.office'),
  },
  {
    value: 1,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.shipping'),
  },
  {
    value: 2,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.receiving'),
  },
  {
    value: 3,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.other'),
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
 * 格式化干系人列表为可读字符串（显示昵称）
 */
export const formatStakeholders = (
  stakeholders?: ClientAdminApi.ClientStakeholderDto[],
): string => {
  if (!stakeholders || stakeholders.length === 0) return '';
  return stakeholders.map((s) => s.userNickName || String(s.userId)).join(', ');
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
    {
      component: 'Select',
      fieldName: 'IsDishonest',
      label: '是否失信',
      componentProps: {
        allowClear: true,
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Input',
      fieldName: 'DishonestRemark',
      label: '失信备注',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'EnterpriseType',
      label: '企业类型',
      componentProps: {
        allowClear: true,
        options: [
          { label: '国有企业', value: 1 },
          { label: '民营企业', value: 2 },
          { label: '外资企业', value: 3 },
          { label: '合资企业', value: 4 },
        ],
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'IsShared',
      label: '是否共享',
      componentProps: {
        allowClear: true,
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'CodeSourceId',
      label: $t('seaExport.client.codeSource'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'LaneSelect',
      fieldName: 'LaneIds',
      label: '优质航线',
      componentProps: {
        mode: 'multiple',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'ClientLevel',
      label: '客户等级',
      componentProps: {
        allowClear: true,
        options: getClientLevelOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Input',
      fieldName: 'Address',
      label: '地址',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'Name',
      label: '客户简称',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'FullName',
      label: '客户全称',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'Code',
      label: '客户代码',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'EnFullName',
      label: '客户英文全称',
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
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
      component: 'shortNameInput',
      fieldName: 'name',
      label: $t('seaExport.client.clientName'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'nameInput',
      fieldName: 'fullName',
      label: $t('seaExport.client.fullName'),
      rules: 'required',
      componentProps: {
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'code',
      label: $t('seaExport.client.code'),
      rules: 'required',
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
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceId',
      label: $t('seaExport.client.codeSource'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('seaExport.client.phone'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'mobile',
      label: $t('seaExport.client.mobile'),
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
      component: 'Select',
      fieldName: 'enterpriseType',
      label: '企业类型',
      componentProps: {
        allowClear: true,
        options: [
          { label: '国有企业', value: 1 },
          { label: '民营企业', value: 2 },
          { label: '外资企业', value: 3 },
          { label: '合资企业', value: 4 },
        ],
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserCompanySelect',
      fieldName: 'orgId',
      label: '所属公司',
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
        autoDefault: true, // 启用自动默认值填充
        // userId 会在 form.vue 中通过 updateSchema 动态设置
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('seaExport.client.remark'),
      formItemClass: 'col-span-2',
      componentProps: { allowClear: true, rows: 1 },
    },
  ];
}
export function useBusinessFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'legalPerson',
      label: $t('seaExport.client.legalPerson'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'registeredCapital',
      label: $t('seaExport.client.registeredCapital'),
      componentProps: { allowClear: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'establishmentDate',
      label: $t('seaExport.client.establishmentDate'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'businessTerm',
      label: $t('seaExport.client.businessTerm'),
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
      componentProps: {
        allowClear: true,
        options: getClientTypeOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'clientLevel',
      label: $t('seaExport.client.clientLevel'),
      componentProps: {
        allowClear: true,
        options: getClientLevelOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'clientCurrencyId',
      label: $t('seaExport.client.clientCurrencyId'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'cargoType',
      label: $t('seaExport.client.cargoType'),
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
      componentProps: { class: 'w-full', disabled: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'clientLastTxnTime',
      label: $t('seaExport.client.clientLastTxnTime'),
      componentProps: { class: 'w-full', disabled: true },
    },
    {
      component: 'Input',
      fieldName: 'clientYearTeu',
      label: '客户年TEU',
      componentProps: {
        allowClear: true,
        disabled: true, // 只读计算字段
      },
    },
    {
      component: 'Input',
      fieldName: 'clientYearTicketCount',
      label: '客户年票数',
      componentProps: {
        allowClear: true,
        disabled: true, // 只读计算字段
      },
    },
    {
      component: 'Switch',
      fieldName: 'isShared',
      label: '是否共享',
      defaultValue: false,
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      formItemClass: 'col-span-3',
      label: $t('seaExport.client.remark'),
      componentProps: { allowClear: true, rows: 1 },
    },
  ];
}

export function useSupplierFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'supplierLevel',
      label: $t('seaExport.client.supplierLevel'),
      componentProps: {
        allowClear: true,
        options: getSupplierLevelOptions(),
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'supplierCurrencyId',
      label: $t('seaExport.client.supplierCurrencyId'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'supplierCoopSince',
      label: '供应商首次合作时间',
      componentProps: { class: 'w-full', disabled: true },
    },
    {
      component: 'DatePicker',
      fieldName: 'supplierLastTxnTime',
      label: '供应商最近交易时间',
      componentProps: { class: 'w-full', disabled: true },
    },
    {
      component: 'Input',
      fieldName: 'supplierYearTeu',
      label: '供应商年TEU',
      componentProps: {
        allowClear: true,
        disabled: true, // 只读计算字段
      },
    },
    {
      component: 'Input',
      fieldName: 'supplierYearTicketCount',
      label: '供应商年票数',
      componentProps: {
        allowClear: true,
        disabled: true, // 只读计算字段
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
      component: 'RadioGroup',
      fieldName: 'addressType',
      label: $t('seaExport.client.addressOptions.addressType'),
      componentProps: {
        options: getAddressTypeOptions(),
      },
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
        options: [], // 移除clientType字段
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
      formItemClass: 'col-span-2',
      componentProps: { allowClear: true, rows: 3 },
    },
  ];
}

/**
 * 表格列配置
 */
export function useColumns(): VxeTableGridOptions<ClientAdminApi.ClientDto>['columns'] {
  return [
    {
      type: 'checkbox',
      width: 56,
      fixed: 'left',
      align: 'center',
    },
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
      field: 'codeSource',
      title: '业务来源',
      minWidth: 120,
      formatter: ({ cellValue }) => {
        // 优先使用 codeSource.cnName，如果不存在则降级使用 codeSourceId
        if (cellValue?.cnName) {
          return cellValue.cnName;
        }
        return '';
      },
    },
    {
      field: 'clientLevel',
      title: '客户等级',
      minWidth: 100,
      formatter: ({ cellValue }) => {
        const levelMap = getClientLevelOptions();
        const level = levelMap.find((item) => item.value === cellValue);
        return level ? level.label : '';
      },
    },
    {
      field: 'clientLaneCodes',
      title: '优质航线',
      minWidth: 150,
      formatter: ({ cellValue }) => {
        if (!cellValue || !Array.isArray(cellValue)) return '';
        return cellValue.map((lane) => lane.laneName).join(', ');
      },
    },
    {
      field: 'taxNo',
      title: '纳税人识别号',
      minWidth: 150,
    },
    {
      field: 'sales',
      title: '销售',
      minWidth: 120,
      formatter: ({ cellValue }) => formatStakeholders(cellValue),
    },
    {
      field: 'operations',
      title: '操作',
      minWidth: 120,
      formatter: ({ cellValue }) => formatStakeholders(cellValue),
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      minWidth: 100,
    },
    {
      field: 'clientType',
      title: '客户 / 供应商',
      minWidth: 120,
      formatter: ({ row }) => {
        const isClient = row.isClient;
        const isSupplier = row.isSupplier;
        if (isClient && isSupplier) {
          return '客户 + 供应商';
        } else if (isClient) {
          return '客户';
        } else if (isSupplier) {
          return '供应商';
        }
        return '';
      },
    },
    {
      field: 'isDishonest',
      title: '是否失信',
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: '是', color: 'error' },
          { value: false, label: '否', color: 'success' },
        ],
      },
    },
    {
      field: 'dishonestRemark',
      title: '失信备注',
      minWidth: 200,
      showOverflow: true,
    },
    {
      field: 'enterpriseType',
      title: '企业类型',
      minWidth: 100,
      formatter: ({ cellValue }) => {
        switch (cellValue) {
          case 1:
            return '国有企业';
          case 2:
            return '民营企业';
          case 3:
            return '外资企业';
          case 4:
            return '合资企业';
          default:
            return '';
        }
      },
    },
    {
      field: 'isShared',
      title: '是否共享',
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: '是', color: 'success' },
          { value: false, label: '否', color: 'default' },
        ],
      },
    },
    {
      field: 'orgs',
      title: '归属组织',
      minWidth: 150,

      formatter: ({ row }) => row.orgs?.at(-1)?.name || '',
    },
    {
      field: 'clientLaneCodes',
      title: '优质航线',
      minWidth: 150,
      formatter: ({ cellValue }) => {
        if (!cellValue || !Array.isArray(cellValue)) return '';
        return cellValue.map((lane) => lane.laneName).join(', ');
      },
    },
    {
      field: 'industryCategories',
      title: $t('seaExport.client.industryCategories'),
      minWidth: 200,
      showOverflow: true,
      formatter: ({ cellValue }) => formatIndustryCategories(cellValue),
    },
    //{
    //   field: 'country',
    //   title: $t('seaExport.client.country'),
    //   minWidth: 100,
    // },
    {
      field: 'enable',
      title: $t('seaExport.client.enable'),
      minWidth: 100,
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
  ];
}

export {
  getClientLevelOptions,
  getEnableOptions,
  getDefaultOptions,
  getIndustryCategoryOptions,
  getCustomerCoopStatusOptions,
  getSupplierCoopStatusOptions,
  getCustomerIndustryCategoryOptions,
  getSupplierIndustryCategoryOptions,
};
