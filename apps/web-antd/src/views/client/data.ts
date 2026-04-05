import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

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
const formatIndustryCategories = (value?: string): string => {
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
    {
      component: 'CheckboxGroup',
      fieldName: 'industryCategories',
      label: $t('seaExport.client.industryCategories'),
      componentProps: {
        options: getIndustryCategoryOptions().map(({ label, value }) => ({
          label,
          value,
        })),
      },
    },
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

export { getClientTypeOptions, getEnableOptions, getIndustryCategoryOptions };
