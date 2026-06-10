import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';

import { formatAmount, formatDateTime } from './form-data';

/** 收费结算列表列配置 */
export function useColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'checkbox',
      width: 60,
      fixed: 'left',
    },
    {
      field: 'settlementNo',
      title: '结算单号',
      minWidth: 170,
      fixed: 'left',
    },
    {
      field: 'status',
      title: '结算状态',
      width: 110,
      slots: { default: 'status' },
    },
    {
      field: 'settlementTime',
      title: '结算时间',
      width: 160,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'bankStatementNo',
      title: '银行流水号',
      minWidth: 170,
    },
    {
      field: 'totalSettledAmount',
      title: '明细总金额',
      width: 130,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'itemCount',
      title: '明细条数',
      width: 100,
      align: 'right',
    },
    {
      field: 'locked',
      title: '锁定状态',
      width: 100,
      slots: { default: 'locked' },
    },
    {
      field: 'lockeTime',
      title: '锁定时间',
      width: 160,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      width: 100,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      width: 160,
      formatter: ({ cellValue }) => formatDateTime(cellValue),
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 180,
      showOverflow: true,
    },
  ];
}

/** 收费结算列表查询表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'settlementNo',
      label: '结算单号',
      componentProps: {
        placeholder: '请输入结算单号',
        allowClear: true,
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'settlementTimeRange',
      label: '结算时间',
      componentProps: {
        placeholder: ['开始时间', '结束时间'],
        showTime: true,
        format: 'YYYY-MM-DD HH:mm',
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
