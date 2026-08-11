import type { VbenFormSchema } from '#/adapter/form';

import { PreOrderStatus } from '#/api/pre-order/pre-order-admin';

/** 列配置持久化 key */
export const PRE_ORDER_LIST_TABLE_ID = 'PreOrderList';

/** 业务联系单表单路径（统一编辑页，按钮显隐由状态控制） */
export function getPreOrderFormPath(id: number | string) {
  return `/pre-order/${id}/edit`;
}

/** 业务联系单状态选项（列表筛选与列标签共用） */
export function getPreOrderStatusOptions() {
  return [
    { label: '录入状态', value: PreOrderStatus.Entering, color: 'default' },
    { label: '待审核', value: PreOrderStatus.Auditing, color: 'processing' },
    { label: '通过', value: PreOrderStatus.Passed, color: 'success' },
    { label: '驳回', value: PreOrderStatus.Rejected, color: 'error' },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: '关键字',
      componentProps: {
        placeholder: '业务编号 / 主提单号',
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: '状态',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: getPreOrderStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'ClientId',
      label: '委托单位',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'POLId',
      label: '起运港',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'PortSelect',
      fieldName: 'PODId',
      label: '目的港',
      componentProps: { allowClear: true, class: 'w-full' },
    },
    {
      component: 'RangePicker',
      fieldName: 'ETDRange',
      label: '开船日期',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'CreatorUserId',
      label: '创建人',
      componentProps: { allowClear: true, class: 'w-full' },
    },
  ];
}

export function buildColumns(): Array<Record<string, any>> {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'preOrderNum',
      title: '业务编号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 100,
      cellRender: { name: 'CellTag', options: getPreOrderStatusOptions() },
    },
    {
      field: 'clientName',
      title: '委托单位',
      minWidth: 180,
      showOverflow: true,
      formatter: ({ row }) => row.client?.name ?? '',
    },
    { field: 'mblNum', title: '主提单号', minWidth: 140 },
    {
      field: 'polName',
      title: '起运港',
      minWidth: 140,
      showOverflow: true,
      formatter: ({ row }) => row.polRemark ?? '',
    },
    {
      field: 'podName',
      title: '目的港',
      minWidth: 140,
      showOverflow: true,
      formatter: ({ row }) => row.podRemark ?? '',
    },
    {
      field: 'carrierName',
      title: '船公司',
      minWidth: 120,
      slots: { default: 'carrierWithLogo' },
    },
    {
      field: 'etd',
      title: '开船日期',
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'goodsCompleteTime',
      title: '货好时间',
      minWidth: 120,
      formatter: 'formatDate',
    },
    { field: 'creatorUserName', title: '创建人', minWidth: 100 },
    {
      field: 'creationTime',
      title: '创建时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
