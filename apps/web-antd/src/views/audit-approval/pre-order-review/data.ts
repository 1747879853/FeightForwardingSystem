import type { VbenFormSchema } from '#/adapter/form';

import { getTaskStatusOptions } from '#/views/audit-approval/data';
import { getPreOrderStatusOptions } from '#/views/pre-order/data';

export function usePreOrderReviewFormSchema(): VbenFormSchema[] {
  const taskStatusOptions = getTaskStatusOptions().map(({ label, value }) => ({
    label,
    value,
  }));

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
      fieldName: 'MyStatus',
      label: '我的审核状态',
      /** 默认审核中(0)，首屏只看待办；重置也回到该值 */
      defaultValue: 0,
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: taskStatusOptions,
      },
    },
    {
      component: 'Select',
      fieldName: 'PreOrderStatus',
      label: '单据状态',
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
      component: 'RangePicker',
      fieldName: 'AuditTimeRange',
      label: '审核时间',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始时间', '结束时间'],
      },
    },
  ];
}

export function usePreOrderReviewColumns(): Array<Record<string, any>> {
  const taskStatusOptions = getTaskStatusOptions();

  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', width: 50, fixed: 'left' },
    {
      field: 'preOrder.preOrderNum',
      title: '业务编号',
      minWidth: 160,
      fixed: 'left',
    },
    {
      field: 'preOrder.status',
      title: '单据状态',
      minWidth: 100,
      cellRender: { name: 'CellTag', options: getPreOrderStatusOptions() },
    },
    {
      field: 'myStatus',
      title: '我的审核状态',
      minWidth: 120,
      cellRender: { name: 'CellTag', options: taskStatusOptions },
    },
    {
      field: 'taskStatus',
      title: '任务状态',
      minWidth: 100,
      cellRender: { name: 'CellTag', options: taskStatusOptions },
    },
    {
      field: 'preOrder.clientName',
      title: '委托单位',
      minWidth: 180,
      showOverflow: true,
    },
    { field: 'preOrder.polName', title: '起运港', minWidth: 140 },
    { field: 'preOrder.podName', title: '目的港', minWidth: 140 },
    {
      field: 'preOrder.etd',
      title: '开船日期',
      minWidth: 120,
      formatter: 'formatDate',
    },
    { field: 'creatorUserName', title: '提交人', minWidth: 100 },
    { field: 'auditUserName', title: '审核人', minWidth: 100 },
    {
      field: 'auditTime',
      title: '审核时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    { field: 'remark', title: '备注', minWidth: 160, showOverflow: true },
  ];
}
