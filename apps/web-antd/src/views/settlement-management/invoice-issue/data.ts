import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

import { $t } from '#/locales';

/** 发票开出方式选项 */
const getInvoiceIssueTypeOptions = () => [
  {
    value: InvoiceIssueApi.InvoiceIssueType.NuonuoInterface,
    label: '诺诺接口开票',
    color: 'blue',
  },
  {
    value: InvoiceIssueApi.InvoiceIssueType.ManualRecord,
    label: '手动记录',
    color: 'orange',
  },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'applicationNo',
      label: '开出单号',
      componentProps: {
        placeholder: '请输入开出单号',
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'invoiceNo',
      label: '发票号',
      componentProps: {
        placeholder: '请输入发票号',
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'invoiceIssueType',
      label: '开票方式',
      componentProps: {
        allowClear: true,
        options: getInvoiceIssueTypeOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: '请选择开票方式',
        class: 'w-full',
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'settlementId',
      label: '结算对象',
      componentProps: {
        placeholder: '请选择结算对象',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: '币别',
      componentProps: {
        placeholder: '请选择币别',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'invoiceType',
      label: '发票类型',
      componentProps: {
        placeholder: '请输入发票类型',
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'invoiceIssueTimeRange',
      label: '开票时间',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'creatorUserId',
      label: '创建人',
      componentProps: {
        placeholder: '请选择创建人',
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

export function useColumns(): VxeTableGridOptions<InvoiceIssueApi.InvoiceIssueListDto>['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: '开出单号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'invoiceNo',
      title: '发票号',
      minWidth: 140,
    },
    {
      field: 'invoiceIssueType',
      title: '开票方式',
      minWidth: 120,
      cellRender: {
        name: 'CellTag',
        options: getInvoiceIssueTypeOptions(),
      },
    },
    {
      field: 'settlementName',
      title: '结算对象',
      minWidth: 160,
      showOverflow: true,
      slots: { default: 'settlementName' },
    },
    {
      field: 'currencyCode',
      title: '币别',
      minWidth: 80,
      slots: { default: 'currencyCode' },
    },
    {
      field: 'invoiceType',
      title: '发票类型',
      minWidth: 120,
    },
    {
      field: 'totalAmount',
      title: '金额合计',
      minWidth: 120,
      align: 'right',
      formatter: ({ cellValue }) => {
        if (cellValue === null || cellValue === undefined) return '-';
        return Number(cellValue).toFixed(2);
      },
    },
    {
      field: 'itemCount',
      title: '申请数量',
      minWidth: 100,
      align: 'center',
    },
    {
      field: 'invoiceIssueTime',
      title: '开票时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'applyUserName',
      title: '申请人',
      minWidth: 100,
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      minWidth: 100,
    },
    {
      field: 'require',
      title: '开票要求',
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
