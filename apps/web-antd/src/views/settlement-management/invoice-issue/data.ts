import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import dayjs from 'dayjs';
import { $t } from '#/locales';

import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

/**
 * 格式化日期时间显示
 */
const formatDateTime = (value: string | undefined | null): string => {
  if (!value) return '-';
  try {
    return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.warn('日期格式化失败:', error);
    return value;
  }
};

/**
 * 获取发票类型中文标签
 */
const getInvoiceTypeLabel = (type: string | undefined | null): string => {
  if (!type) return '-';
  
  const typeMap: Record<string, string> = {
    'p': '普通发票(电票)',
    'c': '普通发票(纸票)',
    's': '专用发票',
  };
  
  return typeMap[type] || type;
};

/**
 * 发票开出列表表格列配置
 */
export const columns: VxeTableGridOptions['columns'] = [
  {
    type: 'checkbox',
    width: 50,
    fixed: 'left',
    align: 'center',
  },
  {
    title: '开出单号',
    field: 'applicationNo',
    width: 150,
    fixed: 'left',
    align: 'left',
  },
  {
    title: '发票号',
    field: 'invoiceNo',
    width: 150,
    align: 'left',
  },
  {
    title: '开票时间',
    field: 'invoiceIssueTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '结算对象',
    field: 'settlement.name',
    width: 150,
    align: 'left',
  },
  {
    title: '发票抬头',
    field: 'clientInvoiceInfo.header',
    width: 180,
    slots: { default: 'clientInvoiceInfoHeader' },
    align: 'left',
  },
  {
    title: '税号',
    field: 'clientInvoiceInfo.taxNum',
    width: 150,
    slots: { default: 'clientInvoiceInfoTaxNum' },
    align: 'left',
  },
  {
    title: '币别',
    field: 'currency.code',
    width: 100,
    align: 'left',
  },
  {
    title: '发票类型',
    field: 'invoiceType',
    width: 140,
    align: 'left',
    formatter: ({ cellValue }) => getInvoiceTypeLabel(cellValue),
  },
  {
    title: '开票汇率',
    field: 'invoiceExchangeRate',
    width: 100,
    align: 'right',
  },
  {
    title: '申请条数',
    field: 'itemCount',
    width: 100,
    align: 'center',
  },
  {
    title: '商品金额合计',
    field: 'totalAmount',
    width: 120,
    align: 'right',
  },
  {
    title: '申请人',
    field: 'applyUserName',
    width: 120,
    align: 'left',
  },
  // {
  //   title: '申请时间',
  //   field: 'applyTime',
  //   width: 160,
  //   align: 'left',
  //   formatter: ({ cellValue }) => formatDateTime(cellValue),
  // },
  {
    title: '创建日期',
    field: 'creationTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '备注',
    field: 'remark',
    minWidth: 150,
    showOverflow: true,
    align: 'left',
  },
];

/**
 * 发票开出查询表单配置
 */
export const searchFormSchema = [
  {
    fieldName: 'applicationNo',
    label: '开出单号',
    component: 'Input',
    componentProps: {
      placeholder: '请输入开出单号',
    },
  },
  {
    fieldName: 'invoiceNo',
    label: '发票号',
    component: 'Input',
    componentProps: {
      placeholder: '请输入发票号',
    },
  },
  {
    fieldName: 'settlementId',
    label: '结算对象',
    component: 'ClientSelect',
    componentProps: {
      placeholder: '请选择结算对象',
    },
  },
  {
    fieldName: 'currencyId',
    label: '币别',
    component: 'CurrencySelect',
    componentProps: {
      placeholder: '请选择币别',
    },
  },
  {
    fieldName: 'invoiceIssueType',
    label: '开出方式',
    component: 'Select',
    componentProps: {
      placeholder: '请选择开出方式',
      options: [
        {
          label: '诺诺接口开票',
          value: InvoiceIssueApi.InvoiceIssueType.NuonuoInterface,
        },
        {
          label: '手动记录',
          value: InvoiceIssueApi.InvoiceIssueType.ManualRecord,
        },
      ],
    },
  },
  {
    fieldName: 'invoiceType',
    label: '发票类型',
    component: 'Select',
    componentProps: {
      placeholder: '请选择发票类型',
      options: [
        { label: '普通发票(电票)', value: 'p' },
        { label: '普通发票(纸票)', value: 'c' },
        { label: '专用发票', value: 's' },
      ],
    },
  },
  {
    fieldName: 'invoiceIssueTimeStart',
    label: '开票时间起',
    component: 'DatePicker',
    componentProps: {
      placeholder: '请选择开始日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
    },
  },
  {
    fieldName: 'invoiceIssueTimeEnd',
    label: '开票时间止',
    component: 'DatePicker',
    componentProps: {
      placeholder: '请选择结束日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
    },
  },
];
