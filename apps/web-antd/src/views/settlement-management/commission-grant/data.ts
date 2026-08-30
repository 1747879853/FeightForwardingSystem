import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';

import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';
import {
  formatAmount,
  formatDateTimeText,
  formatMonth,
  getStatusOptions,
} from '#/views/commission/data';

/**
 * 提成发放页：搜索表单与列定义。
 * 列表复用提成单分页接口（销售与操作共用），提成状态默认筛选审核通过（只有审核通过的才能发放），
 * 也可切换其它状态查看；发放与批量发放仅对审核通过的提成单生效，批量取消发放仅对发放完成状态的生效（需切到发放完成筛选）。
 */

// ==================== 提成类型选项 ====================

export const getCommissionTypeOptions = () => [
  {
    value: CommissionOrderAdminApi.CommissionType.Sales,
    label: $t('commissionOrder.detail.typeSales'),
    color: 'blue',
  },
  {
    value: CommissionOrderAdminApi.CommissionType.Operation,
    label: $t('commissionOrder.detail.typeOperation'),
    color: 'cyan',
  },
];

// ==================== 搜索表单 ====================

export function useCommissionGrantFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('commissionOrder.search.keyword'),
      componentProps: {
        allowClear: true,
        placeholder: $t('commissionOrder.search.keywordPlaceholder'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'userId',
      label: $t('commissionOrder.search.user'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'commissionType',
      label: $t('commissionOrder.detail.type'),
      componentProps: {
        allowClear: true,
        options: getCommissionTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('commissionOrder.search.status'),
      // 默认审核通过：发放仅对审核通过的单据生效；批量取消发放需切到发放完成筛选
      defaultValue: CommissionOrderAdminApi.CommissionOrderStatus.Approved,
      componentProps: {
        allowClear: true,
        options: getStatusOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'accountDateRange',
      label: $t('commissionOrder.search.accountDateRange'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        picker: 'month',
        placeholder: [
          $t('commissionOrder.search.accountDateStart'),
          $t('commissionOrder.search.accountDateEnd'),
        ],
      },
    },
  ];
}

// ==================== 列定义 ====================

/**
 * 提成发放页列定义（无操作列：详情由行双击打开，发放在表格上方工具栏）
 */
export function useCommissionGrantColumns(): VxeTableGridOptions<CommissionOrderAdminApi.CommissionOrderDto>['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    {
      field: 'commissionOrderNum',
      title: $t('commissionOrder.columns.orderNum'),
      minWidth: 170,
      fixed: 'left',
    },
    {
      field: 'commissionType',
      title: $t('commissionOrder.detail.type'),
      minWidth: 100,
      cellRender: { name: 'CellTag', options: getCommissionTypeOptions() },
    },
    {
      field: 'status',
      title: $t('commissionOrder.columns.status'),
      minWidth: 100,
      cellRender: { name: 'CellTag', options: getStatusOptions() },
    },
    {
      field: 'accountDate',
      title: $t('commissionOrder.columns.accountDate'),
      minWidth: 90,
      formatter: ({ cellValue }) => formatMonth(cellValue),
    },
    {
      field: 'user',
      title: $t('commissionOrder.columns.user'),
      minWidth: 100,
      formatter: ({ cellValue }) => cellValue?.nickName ?? '',
    },
    {
      field: 'commissionAmount',
      title: $t('commissionOrder.columns.commissionAmount'),
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'baseSalary',
      title: $t('commissionOrder.columns.baseSalary'),
      minWidth: 100,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'finalAmount',
      title: $t('commissionOrder.columns.finalAmount'),
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'grantAmount',
      title: $t('commissionOrder.columns.grantAmount'),
      minWidth: 110,
      align: 'right',
      formatter: ({ cellValue }) => formatAmount(cellValue),
    },
    {
      field: 'commissionConfigName',
      title: $t('commissionOrder.columns.configName'),
      minWidth: 150,
      showOverflow: true,
    },
    {
      field: 'itemCount',
      title: $t('commissionOrder.columns.itemCount'),
      minWidth: 80,
      align: 'right',
    },
    {
      field: 'auditUserName',
      title: $t('commissionOrder.columns.auditUser'),
      minWidth: 100,
    },
    {
      field: 'auditTime',
      title: $t('commissionOrder.detail.auditTime'),
      minWidth: 160,
      formatter: ({ cellValue }) => formatDateTimeText(cellValue),
    },
    {
      field: 'creationTime',
      title: $t('commissionOrder.columns.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
