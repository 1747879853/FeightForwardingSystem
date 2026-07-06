import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { $t } from '#/locales';

import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

/**
 * 发票开出列表表格列配置
 */
export const columns: VxeTableGridOptions['columns'] = [
  {
    title: '开出单号',
    field: 'applicationNo',
    width: 150,
    fixed: 'left',
  },
  {
    title: '发票号',
    field: 'invoiceNo',
    width: 150,
  },
  {
    title: '开票时间',
    field: 'invoiceIssueTime',
    width: 120,
  },
  {
    title: '结算对象',
    field: 'settlement.name',
    width: 150,
  },
  {
    title: '发票抬头',
    field: 'clientInvoiceInfo.header',
    width: 180,
    slots: { default: 'clientInvoiceInfoHeader' },
  },
  {
    title: '税号',
    field: 'clientInvoiceInfo.taxNum',
    width: 150,
    slots: { default: 'clientInvoiceInfoTaxNum' },
  },
  {
    title: '币别',
    field: 'currency.code',
    width: 100,
  },
  {
    title: '发票类型',
    field: 'invoiceType',
    width: 120,
  },
  {
    title: '开票汇率',
    field: 'invoiceExchangeRate',
    width: 100,
  },
  {
    title: '申请条数',
    field: 'itemCount',
    width: 100,
  },
  {
    title: '商品金额合计',
    field: 'totalAmount',
    width: 120,
  },
  {
    title: '申请人',
    field: 'applyUserName',
    width: 120,
  },
  {
    title: '申请时间',
    field: 'applyTime',
    width: 120,
  },
  {
    title: '备注',
    field: 'remark',
    minWidth: 150,
    showOverflow: true,
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
