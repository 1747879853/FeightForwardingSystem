import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import {
  getPaymentApplicationStatusColor,
  getPaymentApplicationStatusLabel,
  resolvePaymentApplicationStatusTag,
} from '#/constants/application-status';
import { $t } from '#/locales';
import { createKeysSearchSchema } from '#/utils/keys-search';

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
    createKeysSearchSchema({
      fieldName: 'keys',
      help: '精确匹配（非模糊）：主提单号、订舱编号、委托编号',
    }),
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
      field: 'settlement.name',
      title: '结算对象',
      minWidth: 120,
      formatter: ({
        row,
      }: {
        row: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
      }) => row.settlement?.name ?? '',
    },
    {
      field: 'currency.code',
      title: '币别',
      width: 80,
      formatter: ({
        row,
      }: {
        row: PaymentApplicationAdminApi.PaymentApplicationForSettlementDto;
      }) =>
        row.currency?.code ??
        (row.currencyId == null || row.currencyId === 0 ? '原币' : ''),
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
  return getPaymentApplicationStatusColor(status);
}

/** 获取状态文本 */
export function getStatusText(status: number): string {
  return getPaymentApplicationStatusLabel(status, (key) => $t(key));
}

/** 获取状态 Tag 完整属性（含白底黑字等自定义样式） */
export function getStatusTagProps(status: number) {
  const { label, value, ...tagProps } = resolvePaymentApplicationStatusTag(
    status,
    (key) => $t(key),
  );
  return { label, tagProps };
}
