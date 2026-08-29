import type { VbenFormSchema } from '#/adapter/form';

import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import UserSelect from '#/adapter/component/biz-select/user-select.vue';

import SmartPortSelect from './smart-port-select.vue';

/**
 * 报表查询表单公共配置
 * 包含各报表共用的下拉选项常量与表单字段工厂函数，
 * 各报表通过组合公共字段与特有字段构建自己的表单配置
 */

// ==================== 公共下拉选项 ====================

/** 业务类型选项 */
export const BIZ_TYPE_OPTIONS = [
  { label: '海运出口', value: 0 },
  { label: '海运进口', value: 1 },
  { label: '空运出口', value: 2 },
];

/** 货物类型选项 */
export const CARGO_TYPE_OPTIONS = [
  { label: '普通货', value: 0 },
  { label: '冻柜', value: 1 },
  { label: '危险品', value: 2 },
  { label: '超限箱', value: 3 },
];

/** 结算方式选项 */
export const SETTLEMENT_TYPE_OPTIONS = [
  { label: '票结', value: 0 },
  { label: '月结', value: 1 },
  { label: '约定天数', value: 2 },
];

/** 装运方式选项 */
export const BL_TYPE_OPTIONS = [
  { label: '整箱', value: 0 },
  { label: '拼箱主票', value: 1 },
  { label: '拼箱分票', value: 2 },
];

/** 是/否选项 */
export const YES_NO_OPTIONS = [
  { label: '是', value: true },
  { label: '否', value: false },
];

// ==================== 公共表单字段工厂 ====================

/** 业务类型 */
export function bizTypeField(): VbenFormSchema {
  return {
    fieldName: 'bizType',
    label: '业务类型',
    component: 'Select',
    componentProps: {
      options: BIZ_TYPE_OPTIONS,
      allowClear: true,
      placeholder: '请选择业务类型',
      style: { width: '100%' },
    },
  };
}

/** 委托单位 */
export function clientField(): VbenFormSchema {
  return {
    fieldName: 'clientId',
    label: '委托单位',
    component: ClientSelect,
    componentProps: {
      placeholder: '请选择委托单位',
      style: { width: '100%' },
    },
  };
}

/** 关键词（主提单号或委托编号） */
export function keywordField(): VbenFormSchema {
  return {
    fieldName: 'keyword',
    label: '关键词',
    component: 'Input',
    componentProps: {
      placeholder: '主提单号或委托编号',
      allowClear: true,
      style: { width: '100%' },
    },
  };
}

/** 业务日期起止（两个字段） */
export function bizDateRangeFields(): VbenFormSchema[] {
  return [
    {
      fieldName: 'bizDateStart',
      label: '业务日期起',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择开始日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'bizDateEnd',
      label: '业务日期止',
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择结束日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
    },
  ];
}

/** 货物类型 */
export function cargoField(): VbenFormSchema {
  return {
    fieldName: 'cargoId',
    label: '货物类型',
    component: 'Select',
    componentProps: {
      options: CARGO_TYPE_OPTIONS,
      allowClear: true,
      placeholder: '请选择货物类型',
      style: { width: '100%' },
    },
  };
}

/** 结算方式 */
export function settlementTypeField(): VbenFormSchema {
  return {
    fieldName: 'settlementType',
    label: '结算方式',
    component: 'Select',
    componentProps: {
      options: SETTLEMENT_TYPE_OPTIONS,
      allowClear: true,
      placeholder: '请选择结算方式',
      style: { width: '100%' },
    },
  };
}

/** 合并更改单 */
export function mergeChangeOrderField(): VbenFormSchema {
  return {
    fieldName: 'isMergeChangeOrder',
    label: '合并更改单',
    component: 'Switch',
    defaultValue: false,
    componentProps: {
      checkedChildren: '是',
      unCheckedChildren: '否',
    },
  };
}

/** 订舱代理 */
export function bookingAgentField(): VbenFormSchema {
  return {
    fieldName: 'bookingAgentId',
    label: '订舱代理',
    component: ClientSelect,
    componentProps: {
      placeholder: '请选择订舱代理',
      style: { width: '100%' },
    },
  };
}

/** 船公司 */
export function carrierField(): VbenFormSchema {
  return {
    fieldName: 'carrierId',
    label: '船公司',
    component: CarrierSelect,
    componentProps: {
      placeholder: '请选择船公司',
      style: { width: '100%' },
    },
  };
}

/** 销售（多选） */
export function saleUserField(): VbenFormSchema {
  return {
    fieldName: 'saleUserIds',
    label: '销售',
    component: UserSelect,
    componentProps: {
      mode: 'multiple',
      placeholder: '请选择销售',
      style: { width: '100%' },
    },
  };
}

/** 操作（多选） */
export function operationUserField(): VbenFormSchema {
  return {
    fieldName: 'operationUserIds',
    label: '操作',
    component: UserSelect,
    componentProps: {
      mode: 'multiple',
      placeholder: '请选择操作',
      style: { width: '100%' },
    },
  };
}

/** 场站 */
export function yardField(): VbenFormSchema {
  return {
    fieldName: 'yardId',
    label: '场站',
    component: ClientSelect,
    componentProps: {
      placeholder: '请选择场站',
      style: { width: '100%' },
    },
  };
}

/** 装运方式 */
export function blTypeField(): VbenFormSchema {
  return {
    fieldName: 'blType',
    label: '装运方式',
    component: 'Select',
    componentProps: {
      options: BL_TYPE_OPTIONS,
      allowClear: true,
      placeholder: '请选择装运方式',
      style: { width: '100%' },
    },
  };
}

/** 船名 */
export function vesselField(): VbenFormSchema {
  return {
    fieldName: 'vessel',
    label: '船名',
    component: 'Input',
    componentProps: {
      placeholder: '请输入船名',
      allowClear: true,
      style: { width: '100%' },
    },
  };
}

/** 航次 */
export function innerVoynoField(): VbenFormSchema {
  return {
    fieldName: 'innerVoyno',
    label: '航次',
    component: 'Input',
    componentProps: {
      placeholder: '请输入航次',
      allowClear: true,
      style: { width: '100%' },
    },
  };
}

/** 起运港（根据业务类型自动切换海港/空港） */
export function polField(): VbenFormSchema {
  return {
    fieldName: 'polId',
    label: '起运港',
    component: SmartPortSelect,
    componentProps: (formValues: any) => ({
      placeholder: '请选择起运港',
      style: { width: '100%' },
      bizType: formValues.bizType,
    }),
  };
}

/** 目的港（根据业务类型自动切换海港/空港） */
export function podField(): VbenFormSchema {
  return {
    fieldName: 'podId',
    label: '目的港',
    component: SmartPortSelect,
    componentProps: (formValues: any) => ({
      placeholder: '请选择目的港',
      style: { width: '100%' },
      bizType: formValues.bizType,
    }),
  };
}

/** 会计期间起止（两个字段，按月选择） */
export function accountDateRangeFields(): VbenFormSchema[] {
  return [
    {
      fieldName: 'accountDateStart',
      label: '会计期间起',
      component: 'DatePicker',
      componentProps: {
        picker: 'month',
        placeholder: '请选择开始月份',
        format: 'YYYY-MM',
        valueFormat: 'YYYY-MM',
        style: { width: '100%' },
      },
    },
    {
      fieldName: 'accountDateEnd',
      label: '会计期间止',
      component: 'DatePicker',
      componentProps: {
        picker: 'month',
        placeholder: '请选择结束月份',
        format: 'YYYY-MM',
        valueFormat: 'YYYY-MM',
        style: { width: '100%' },
      },
    },
  ];
}

/**
 * 报表查询表单的公共字段集合
 * 两个报表共有的 15+ 个字段，按原有顺序组合；
 * 各报表可在其前后插入特有字段
 */
export function getCommonReportFormFields(): VbenFormSchema[] {
  return [
    bizTypeField(),
    clientField(),
    keywordField(),
    ...bizDateRangeFields(),
    cargoField(),
    settlementTypeField(),
    mergeChangeOrderField(),
    bookingAgentField(),
    carrierField(),
    saleUserField(),
    operationUserField(),
    yardField(),
    blTypeField(),
    vesselField(),
    innerVoynoField(),
    polField(),
    podField(),
    ...accountDateRangeFields(),
  ];
}
