import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { $t } from '#/locales';

/** 查询表单配置 */
export function useSearchSchema() {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '关键字',
      componentProps: {
        placeholder: '委托编号/主提单号/订舱号',
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
      fieldName: 'submitTimeRange',
      label: '提交时间',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        showTime: true,
        format: 'YYYY-MM-DD HH:mm',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'endTimeRange',
      label: '最晚付款时间',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        showTime: false,
        format: 'YYYY-MM-DD',
        allowClear: true,
        class: 'w-full',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'creatorUserId',
      label: '申请人',
      componentProps: {
        placeholder: '请选择申请人',
        allowClear: true,
        class: 'w-full',
      },
    },
  ];
}

/** 付费申请表格列配置 */
export function useApplicationColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 60,
      fixed: 'left',
    },
    {
      field: 'applicationNo',
      title: '申请单号',
      minWidth: 150,
      fixed: 'left',
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    {
      field: 'clientName',
      title: '结算对象',
      minWidth: 120,
    },
    {
      field: 'currencyCode',
      title: '币别',
      width: 80,
    },
    {
      field: 'totalPayPrice',
      title: '应付金额',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => {
        if (cellValue === undefined || cellValue === null) return '-';
        return cellValue.toFixed(2);
      },
    },
    {
      field: 'totalReceivePrice',
      title: '应收金额',
      width: 120,
      align: 'right',
      formatter: ({ cellValue }) => {
        if (cellValue === undefined || cellValue === null) return '-';
        return cellValue.toFixed(2);
      },
    },
    {
      field: 'submitTime',
      title: '提交时间',
      width: 160,
      formatter: ({ cellValue }) => {
        if (!cellValue) return '-';
        const date = new Date(cellValue);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      },
    },
    {
      field: 'endTime',
      title: '最晚付款时间',
      width: 120,
      formatter: ({ cellValue }) => {
        if (!cellValue) return '-';
        const date = new Date(cellValue);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      },
    },
    {
      field: 'creatorUserName',
      title: '申请人',
      width: 100,
    },
  ];
}

/** 获取状态标签颜色 */
export function getStatusColor(status: number): string {
  const colorMap: Record<number, string> = {
    3: 'success',
    4: 'warning',
  };
  return colorMap[status] || 'default';
}

/** 获取状态文本 */
export function getStatusText(status: number): string {
  const textMap: Record<number, string> = {
    3: '审核通过',
    4: '部分结算',
  };
  return textMap[status] || '未知';
}
