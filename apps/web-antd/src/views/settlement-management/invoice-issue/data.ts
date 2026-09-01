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
    p: '普通发票(电票)',
    c: '普通发票(纸票)',
    s: '专用发票',
  };

  return typeMap[type] || type;
};

/**
 * 获取开票状态中文标签
 */
const getIssueStatusLabel = (status: number | undefined | null): string => {
  if (status === undefined || status === null) return '-';

  const statusMap: Record<number, string> = {
    0: '待开票',
    1: '开票中',
    2: '开票完成',
    3: '开票失败',
  };

  return statusMap[status] || String(status);
};

/**
 * 获取红冲状态中文标签
 */
const getRedStatusLabel = (status: number | undefined | null): string => {
  if (status === undefined || status === null) return '-';

  const statusMap: Record<number, string> = {
    0: '未冲红',
    1: '无需确认',
    2: '待购方确认',
    3: '待销方确认',
    4: '双方已确认',
    5: '已作废(购方否认)',
    6: '已作废(销方否认)',
    7: '已作废(超时未确认)',
    8: '已作废(发起方撤销)',
    9: '已作废(确认后撤销)',
    15: '申请中',
    16: '申请失败', // C# 枚举原文为“申请失败”，如需与你示例保持一致可改为 '冲红失败'
    99: '冲红完成',
  };

  return statusMap[status] || String(status);
};

/**
 * 格式化锁定状态显示
 */
const getLockedLabel = (locked: boolean | undefined | null): string => {
  if (locked) return '是';
  return '否';
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
    title: '开票状态',
    field: 'issueStatus',
    width: 120,
    align: 'center',
    slots: { default: 'issueStatus' },
  },
  {
    title: '提交订单号',
    field: 'issueOrderNo',
    width: 180,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '发票流水号',
    field: 'issueSerialNum',
    width: 180,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '提交开票时间',
    field: 'issueRequestTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '发票代码',
    field: 'invoiceCode',
    width: 150,
    align: 'left',
  },
  {
    title: '开票失败原因',
    field: 'issueFailCause',
    minWidth: 150,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '红冲状态',
    field: 'redStatus',
    width: 120,
    align: 'center',
    slots: { default: 'redStatus' },
  },
  {
    title: '冲红原因',
    field: 'redReason',
    width: 120,
    align: 'center',
    formatter: ({ cellValue }) => {
      if (cellValue === undefined || cellValue === null) return '-';
      const reasonMap: Record<number, string> = {
        1: '销货退回',
        2: '开票有误',
        3: '服务中止',
        4: '销售折让',
      };
      return reasonMap[cellValue] || String(cellValue);
    },
  },
  {
    title: '红字确认单号',
    field: 'redBillNo',
    width: 180,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '红票订单号',
    field: 'redOrderNo',
    width: 180,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '红票流水号',
    field: 'redSerialNum',
    width: 180,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '红票发票号码',
    field: 'redInvoiceNo',
    width: 150,
    align: 'left',
  },
  {
    title: '红票发票代码',
    field: 'redInvoiceCode',
    width: 150,
    align: 'left',
  },
  {
    title: '红票开票时间',
    field: 'redInvoiceTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '发起冲红时间',
    field: 'redApplyTime',
    width: 160,
    align: 'left',
    formatter: ({ cellValue }) => formatDateTime(cellValue),
  },
  {
    title: '发起人',
    field: 'redApplyUserName',
    width: 120,
    align: 'left',
  },
  {
    title: '冲红失败原因',
    field: 'redFailCause',
    minWidth: 150,
    align: 'left',
    showOverflow: true,
  },
  {
    title: '编辑锁定',
    field: 'editLocked',
    width: 100,
    align: 'center',
    slots: { default: 'editLocked' },
  },
  {
    title: '冲红锁定',
    field: 'redLocked',
    width: 100,
    align: 'center',
    slots: { default: 'redLocked' },
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
    fieldName: 'keyword',
    label: '关键字',
    component: 'Input',
    componentProps: {
      placeholder: '开出编号/委托编号/主提单号',
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
    fieldName: 'creatorUserId',
    label: '创建人',
    component: 'UserSelect',
    componentProps: {
      placeholder: '请选择创建人',
    },
  },
  {
    fieldName: 'invoiceIssueType',
    label: '开出方式',
    component: 'Select',
    componentProps: {
      placeholder: '请选择开出方式',
      clearable: true,
      options: [
        {
          label: '接口开票',
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
      clearable: true,
      options: [
        { label: '普通发票(电票)', value: 'p' },
        { label: '普通发票(纸票)', value: 'c' },
        { label: '专用发票', value: 's' },
      ],
    },
  },
  {
    fieldName: 'redStatus',
    label: '冲红状态',
    component: 'Select',
    componentProps: {
      placeholder: '请选择冲红状态',
      clearable: true,
      options: [
        { label: '未冲红', value: 0 },
        { label: '无需确认', value: 1 },
        { label: '待购方确认', value: 2 },
        { label: '待销方确认', value: 3 },
        { label: '双方已确认', value: 4 },
        { label: '已作废(购方否认)', value: 5 },
        { label: '已作废(销方否认)', value: 6 },
        { label: '已作废(超时未确认)', value: 7 },
        { label: '已作废(发起方撤销)', value: 8 },
        { label: '已作废(确认后撤销)', value: 9 },
        { label: '申请中', value: 15 },
        { label: '冲红失败', value: 16 },
        { label: '冲红完成', value: 99 },
      ],
    },
  },
  {
    fieldName: 'Remark',
    label: '备注',
    component: 'Input',
    componentProps: {
      placeholder: '请输入备注',
    },
  },
  {
    fieldName: 'invoiceIssueTimeStart',
    label: '开票时间起',
    component: 'DatePicker',
    clearable: true,
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
    clearable: true,
    componentProps: {
      placeholder: '请选择结束日期',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
    },
  },
];
