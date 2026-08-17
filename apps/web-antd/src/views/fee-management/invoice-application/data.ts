import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { getInvoiceApplicationStatusOptions } from '#/constants/application-status';
import { $t } from '#/locales';

/** 开票申请状态选项 */
export const invoiceApplicationStatusOptions = () =>
  getInvoiceApplicationStatusOptions((key) => $t(key));
/** 发票类型选项 */
export const getInvoiceTypeOptions = () => [
  {
    value: InvoiceApplicationApi.InvoiceType.NormalElectric,
    label: '普通发票(电票)',
  },
  {
    value: InvoiceApplicationApi.InvoiceType.NormalPaper,
    label: '普通发票(纸票)',
  },
  {
    value: InvoiceApplicationApi.InvoiceType.Special,
    label: '专用发票',
  },
];

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '编号',
      componentProps: {
        placeholder: '主提单号/委托编号',
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'applicationNo',
      label: '申请单号',
      componentProps: {
        placeholder: '请输入申请单号',
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
      fieldName: 'status',
      label: '状态',
      componentProps: {
        allowClear: true,
        options: invoiceApplicationStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: '请选择状态',
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
      component: 'RangePicker',
      fieldName: 'applyTimeRange',
      label: '申请时间',
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

export function useColumns(): VxeTableGridOptions<InvoiceApplicationApi.InvoiceApplicationListDto>['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'applicationNo',
      title: '申请单号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'invoiceNo',
      title: '发票号',
      minWidth: 140,
    },
    {
      field: 'mblNums',
      title: '主提单号',
      minWidth: 140,
    },
    {
      field: 'commissionNums',
      title: '委托编号',
      minWidth: 140,
    },
    {
      field: 'settlementName',
      title: '结算对象',
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'currencyCode',
      title: '币别',
      minWidth: 80,
    },
    {
      field: 'invoiceType',
      title: '发票类型',
      minWidth: 120,
      formatter: ({ cellValue }) => {
        const options = getInvoiceTypeOptions();
        const option = options.find((item) => item.value === cellValue);
        return option?.label || '-';
      },
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      cellRender: {
        name: 'CellTag',
        options: invoiceApplicationStatusOptions(),
      },
      slots: { default: 'status' },
    },
    {
      field: 'totalAppliedAmount',
      title: '申请金额合计',
      minWidth: 120,
      align: 'right',
      formatter: ({ cellValue }) => {
        if (cellValue === null || cellValue === undefined) return '-';
        return Number(cellValue).toFixed(2);
      },
    },
    {
      field: 'invoiceAmount',
      title: '发票金额',
      minWidth: 120,
      align: 'right',
      formatter: ({ cellValue }) => {
        if (cellValue === null || cellValue === undefined) return '-';
        return Number(cellValue).toFixed(2);
      },
    },
    {
      field: 'itemCount',
      title: '费用数量',
      minWidth: 100,
      align: 'center',
    },
    {
      field: 'applyUserName',
      title: '申请人',
      minWidth: 100,
    },
    {
      field: 'applyTime',
      title: '申请时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'rejectUserNickName',
      title: '驳回人',
      minWidth: 100,
    },
    {
      field: 'rejectReason',
      title: '驳回原因',
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      minWidth: 100,
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
      showOverflow: true,
    },
  ];
}
