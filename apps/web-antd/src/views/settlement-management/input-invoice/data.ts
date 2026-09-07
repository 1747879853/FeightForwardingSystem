import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import dayjs from 'dayjs';

import {
  boolOptions,
  checkedStatusOptions,
  enterAccountStatusOptions,
  getCheckedStatusLabel,
  getEnterAccountStatusLabel,
  getInvoiceLineLabel,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  getLevelLabel,
  getReimbursementStatusLabel,
  getSignStatusLabel,
  invoiceLineOptions,
  invoiceStatusOptions,
  invoiceTypeOptions,
  levelOptions,
  reimbursementStatusOptions,
  signStatusOptions,
  specialTypeOptions,
} from './constants';

/** 格式化日期时间显示 */
const formatDateTime = (value: null | string | undefined): string => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.format('YYYY-MM-DD HH:mm:ss')
    : String(value);
};

/** 金额显示（保留原值，空值显示 -；decimal 可能以字符串下发） */
const formatAmount = (value: null | number | string | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

/** 布尔显示 是/否 */
const formatBool = (value: boolean | undefined): string =>
  value ? '是' : '否';

/**
 * 进项发票列表表格列配置。
 * 列表不返回商品明细与特定业务数组（走详情），故此处只排票面/金额/状态/组织等字段。
 */
export const columns: VxeTableGridOptions['columns'] = [
  {
    title: '发票号码',
    field: 'invoiceNo',
    width: 150,
    fixed: 'left',
    align: 'left',
  },
  {
    title: '发票种类',
    field: 'invoiceLine',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => getInvoiceLineLabel(cellValue),
  },
  {
    title: '蓝/红',
    field: 'invoiceType',
    width: 80,
    align: 'center',
    slots: { default: 'invoiceType' },
  },
  {
    title: '发票状态',
    field: 'invoiceStatus',
    width: 110,
    align: 'center',
    slots: { default: 'invoiceStatus' },
  },
  {
    title: '开票时间',
    field: 'invoiceTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '销方名称',
    field: 'sellerHeader',
    width: 220,
    align: 'left',
    showOverflow: true,
  },
  { title: '销方税号', field: 'sellerTaxNo', width: 170, align: 'left' },
  {
    title: '购方名称',
    field: 'payerName',
    width: 220,
    align: 'left',
    showOverflow: true,
  },
  { title: '购方税号', field: 'payerTaxNo', width: 170, align: 'left' },
  {
    title: '含税总金额',
    field: 'totalAmount',
    width: 120,
    align: 'right',
    formatter: ({ cellValue }) => formatAmount(cellValue),
  },
  {
    title: '不含税总金额',
    field: 'exTaxAmount',
    width: 130,
    align: 'right',
    formatter: ({ cellValue }) => formatAmount(cellValue),
  },
  {
    title: '税额',
    field: 'taxAmount',
    width: 110,
    align: 'right',
    formatter: ({ cellValue }) => formatAmount(cellValue),
  },
  { title: '开票人', field: 'clerk', width: 100, align: 'left' },
  {
    title: '所属公司',
    field: 'company.displayName',
    width: 200,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '查验状态',
    field: 'checkedInvoiceStatus',
    width: 110,
    align: 'center',
    formatter: ({ cellValue }) => getCheckedStatusLabel(cellValue),
  },
  {
    title: '报销状态',
    field: 'reimbursementStatus',
    width: 100,
    align: 'center',
    formatter: ({ cellValue }) => getReimbursementStatusLabel(cellValue),
  },
  {
    title: '签收状态',
    field: 'signStatus',
    width: 100,
    align: 'center',
    formatter: ({ cellValue }) => getSignStatusLabel(cellValue),
  },
  {
    title: '入账状态',
    field: 'enterAccountStatus',
    width: 150,
    align: 'center',
    formatter: ({ cellValue }) => getEnterAccountStatusLabel(cellValue),
  },
  {
    title: '精确等级',
    field: 'level',
    width: 100,
    align: 'center',
    formatter: ({ cellValue }) => getLevelLabel(cellValue),
  },
  {
    title: '已使用',
    field: 'isUsed',
    width: 90,
    align: 'center',
    slots: { default: 'isUsed' },
  },
  {
    title: '有明细',
    field: 'hasDetail',
    width: 90,
    align: 'center',
    formatter: ({ cellValue }) => formatBool(cellValue),
  },
  {
    title: '发票池更新时间',
    field: 'poolUpdateTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '落入本地时间',
    field: 'creationTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  { title: '创建人', field: 'creatorUserName', width: 110, align: 'left' },
  {
    title: '关联付费申请',
    field: 'paymentApplication.applicationNo',
    width: 150,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '备注',
    field: 'remark',
    minWidth: 150,
    align: 'left',
    showOverflow: true,
  },
];

/**
 * 进项发票查询表单配置。
 * 字段名与 InputInvoiceQueryDto 一致（camelCase），日期区间起止在 list.vue 里转 ISO。
 * invoiceType / payerName / sellerHeader 与分组维度互斥，启用对应分组时会被自动禁用清空。
 */
export const searchFormSchema = [
  {
    fieldName: 'keyword',
    label: '关键字',
    component: 'Input',
    componentProps: {
      placeholder: '发票号/数电号/发票代码/销方名称/销方税号',
      allowClear: true,
    },
  },
  {
    fieldName: 'invoiceNo',
    label: '发票号码',
    component: 'Input',
    componentProps: { placeholder: '请输入发票号码', allowClear: true },
  },
  {
    fieldName: 'elecInvoiceNumber',
    label: '数电号码',
    component: 'Input',
    componentProps: { placeholder: '请输入数电号码', allowClear: true },
  },
  {
    fieldName: 'invoiceCode',
    label: '发票代码',
    component: 'Input',
    componentProps: { placeholder: '请输入发票代码', allowClear: true },
  },
  {
    fieldName: 'serialNo',
    label: '流水号',
    component: 'Input',
    componentProps: { placeholder: '发票请求流水号', allowClear: true },
  },
  {
    fieldName: 'sellerHeader',
    label: '销方名称',
    component: 'Input',
    componentProps: { placeholder: '请输入销方名称', allowClear: true },
  },
  {
    fieldName: 'sellerTaxNo',
    label: '销方税号',
    component: 'Input',
    componentProps: { placeholder: '请输入销方税号', allowClear: true },
  },
  {
    fieldName: 'payerName',
    label: '购方名称',
    component: 'Input',
    componentProps: { placeholder: '请输入购方名称', allowClear: true },
  },
  {
    fieldName: 'payerTaxNo',
    label: '购方税号',
    component: 'Input',
    componentProps: { placeholder: '精确匹配', allowClear: true },
  },
  {
    fieldName: 'clerk',
    label: '开票人',
    component: 'Input',
    componentProps: { placeholder: '请输入开票人', allowClear: true },
  },
  {
    fieldName: 'remark',
    label: '备注',
    component: 'Input',
    componentProps: { placeholder: '请输入备注', allowClear: true },
  },
  {
    fieldName: 'orgId',
    label: '所属公司',
    component: 'MyCompanySelect',
    componentProps: { placeholder: '请选择所属公司', autoDefault: false },
  },
  {
    fieldName: 'creatorUserId',
    label: '创建人',
    component: 'UserSelect',
    componentProps: { placeholder: '仅手动拉入的票有创建人' },
  },
  {
    fieldName: 'invoiceLine',
    label: '发票种类',
    component: 'Select',
    componentProps: {
      placeholder: '请选择发票种类',
      options: invoiceLineOptions,
      showSearch: true,
      optionFilterProp: 'label',
      allowClear: true,
    },
  },
  {
    fieldName: 'invoiceStatus',
    label: '发票状态',
    component: 'Select',
    componentProps: {
      placeholder: '请选择发票状态',
      options: invoiceStatusOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'invoiceType',
    label: '发票类型',
    component: 'Select',
    componentProps: {
      placeholder: '蓝票/红票',
      options: invoiceTypeOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'level',
    label: '精确等级',
    component: 'Select',
    componentProps: {
      placeholder: '请选择精确等级',
      options: levelOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'specialInvoiceType',
    label: '特定业务',
    component: 'Select',
    componentProps: {
      placeholder: '请选择特定业务类型',
      options: specialTypeOptions,
      showSearch: true,
      optionFilterProp: 'label',
      allowClear: true,
    },
  },
  {
    fieldName: 'checkedInvoiceStatus',
    label: '查验状态',
    component: 'Select',
    componentProps: {
      placeholder: '票面查验状态',
      options: checkedStatusOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'reimbursementStatus',
    label: '报销状态',
    component: 'Select',
    componentProps: {
      placeholder: '请选择报销状态',
      options: reimbursementStatusOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'signStatus',
    label: '签收状态',
    component: 'Select',
    componentProps: {
      placeholder: '请选择签收状态',
      options: signStatusOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'enterAccountStatus',
    label: '入账状态',
    component: 'Select',
    componentProps: {
      placeholder: '请选择税局入账状态',
      options: enterAccountStatusOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'hasDetail',
    label: '有明细',
    component: 'Select',
    componentProps: {
      placeholder: '是否已拉到明细',
      options: boolOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'includeRedInvoice',
    label: '含冲红',
    component: 'Select',
    componentProps: {
      placeholder: '是否包含冲红发票',
      options: boolOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'isUsed',
    label: '已使用',
    component: 'Select',
    componentProps: {
      placeholder: '是否已关联付费申请',
      options: boolOptions,
      allowClear: true,
    },
  },
  {
    fieldName: 'totalAmountStart',
    label: '含税金额起',
    component: 'InputNumber',
    componentProps: { placeholder: '最小值', class: 'w-full', min: 0 },
  },
  {
    fieldName: 'totalAmountEnd',
    label: '含税金额止',
    component: 'InputNumber',
    componentProps: { placeholder: '最大值', class: 'w-full', min: 0 },
  },
  {
    fieldName: 'invoiceTimeStart',
    label: '开票时间起',
    component: 'DatePicker',
    componentProps: {
      placeholder: '请选择开始日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      class: 'w-full',
    },
  },
  {
    fieldName: 'invoiceTimeEnd',
    label: '开票时间止',
    component: 'DatePicker',
    componentProps: {
      placeholder: '请选择结束日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      class: 'w-full',
    },
  },
  {
    fieldName: 'creationTimeStart',
    label: '落入本地起',
    component: 'DatePicker',
    componentProps: {
      placeholder: '请选择开始日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      class: 'w-full',
    },
  },
  {
    fieldName: 'creationTimeEnd',
    label: '落入本地止',
    component: 'DatePicker',
    componentProps: {
      placeholder: '请选择结束日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      class: 'w-full',
    },
  },
];

/** 列表状态列的 Tag 颜色（发票状态） */
export const getInvoiceStatusColor = (
  status: null | number | undefined,
): string => {
  switch (status) {
    case 1: {
      return 'success'; // 正常
    }
    case 2:
    case 7:
    case 8:
    case 9: {
      return 'error'; // 红冲 / 红字待确认 / 已部分冲红 / 已全部冲红
    }
    case 3: {
      return 'default'; // 作废
    }
    case 4:
    case 5:
    case 6: {
      return 'warning'; // 失控 / 异常 / 认证异常
    }
    default: {
      return 'default';
    }
  }
};

/** 列表蓝/红列的 Tag 颜色：蓝票蓝色、红票红色 */
export const getInvoiceTypeColor = (
  type: null | number | undefined,
): string => {
  switch (type) {
    case 1: {
      return 'blue'; // 蓝票
    }
    case 2: {
      return 'red'; // 红票
    }
    default: {
      return 'default';
    }
  }
};

export { getInvoiceStatusLabel, getInvoiceTypeLabel };
