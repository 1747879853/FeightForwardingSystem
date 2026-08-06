import type { VbenFormSchema } from '#/adapter/form';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import { getServiceTypeOptions } from '#/views/sea-export-admin/orderFee/data';

/**
 * 业务类型枚举选项
 */
export const bizTypeOptions: Array<{ label: string; value: number }> = [
  { label: '海运出口', value: 0 },
];

/**
 * 收付类型枚举选项
 */
export const paySideOptions: Array<{ label: string; value: number }> = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

/**
 * 贸易条款枚举选项
 */
export const tradeTermsOptions: Array<{ label: string; value: number }> = [
  { label: 'CIF', value: 0 },
  { label: 'FOB', value: 1 },
  { label: 'EXW', value: 2 },
  { label: 'FCA', value: 3 },
  { label: 'DDP', value: 4 },
  { label: 'DDU', value: 5 },
  { label: 'DAP', value: 6 },
  { label: 'C&F', value: 7 },
];

/**
 * 货物类型枚举选项
 */
export const cargoTypeOptions: Array<{ label: string; value: number }> = [
  { label: '普通货', value: 0 },
  { label: '冷藏货', value: 1 },
  { label: '危险品', value: 2 },
  { label: '超尺寸货', value: 3 },
];

/**
 * 提单类型枚举选项
 */
export const blTypeOptions: Array<{ label: string; value: number }> = [
  { label: '整柜', value: 0 },
  { label: '拼箱分票', value: 1 },
  { label: '拼箱主票', value: 2 },
];

/**
 * 创建ClientSelect的schema配置辅助函数
 */
function createClientSelectSchema(options: {
  fieldName: string;
  label: string;
  industryCategory?: string;
}) {
  return {
    fieldName: options.fieldName,
    label: options.label,
    component: ClientSelect,
    componentProps: {
      placeholder: `请选择${options.label}（留空表示所有）`,
      allowClear: true,
      style: { width: '100%' },
      ...(options.industryCategory
        ? { industryCategory: options.industryCategory }
        : {}),
    },
  };
}

/**
 * 获取表单schema配置
 */
export function getFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '模板名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: '请输入模板名称',
        maxlength: 64,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'bizType',
      label: '业务类型',
      component: 'Select',
      rules: 'required',
      defaultValue: 0,
      componentProps: {
        placeholder: '请选择业务类型',
        options: bizTypeOptions,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'paySide',
      label: '收付类型',
      component: 'Select',
      rules: 'required',
      defaultValue: 0,
      componentProps: {
        placeholder: '请选择收付类型',
        options: paySideOptions,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'efficient',
      label: '长期有效',
      component: 'Switch',
      defaultValue: true,
    },
    {
      fieldName: 'startTime',
      label: '生效开始时间',
      component: 'DatePicker',
      dependencies: {
        triggerFields: ['efficient'],
        if(values: any) {
          return !values.efficient;
        },
      },
      componentProps: {
        placeholder: '请选择开始时间',
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'endTime',
      label: '生效结束时间',
      component: 'DatePicker',
      dependencies: {
        triggerFields: ['efficient'],
        if(values: any) {
          return !values.efficient;
        },
      },
      componentProps: {
        placeholder: '请选择结束时间',
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        style: { width: '100%' },
      },
    },
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: '委托单位',
    }),
    {
      fieldName: 'tradeTermsType',
      label: '贸易条款',
      component: 'Select',
      componentProps: {
        placeholder: '请选择贸易条款（留空表示所有）',
        options: tradeTermsOptions,
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'cargoId',
      label: '货物类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择货物类型（留空表示所有）',
        options: cargoTypeOptions,
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'carrierId',
      label: '船公司',
      component: CarrierSelect,
      componentProps: {
        placeholder: '请选择船公司（留空表示所有）',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    createClientSelectSchema({
      fieldName: 'bookingAgentId',
      industryCategory: 'o',
      label: '订舱代理',
    }),
    {
      fieldName: 'polId',
      label: '起运港',
      component: PortSelect,
      componentProps: {
        placeholder: '请选择起运港（留空表示所有）',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'podId',
      label: '目的港',
      component: PortSelect,
      componentProps: {
        placeholder: '请选择目的港（留空表示所有）',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'blType',
      label: '装运方式',
      component: 'Select',
      componentProps: {
        placeholder: '请选择装运方式（留空表示所有）',
        options: blTypeOptions,
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'serviceType',
      label: '服务项',
      component: 'Select',
      componentProps: {
        placeholder: '请选择服务项（留空表示所有）',
        options: getServiceTypeOptions(),
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'sortId',
      label: '排序',
      component: 'InputNumber',
      defaultValue: 0,
      componentProps: {
        placeholder: '请输入排序号',
        min: 0,
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        maxlength: 4096,
        rows: 1,
        style: { width: '100%' },
      },
    },
  ];
}
