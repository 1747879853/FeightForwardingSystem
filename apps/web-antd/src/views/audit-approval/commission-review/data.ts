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
 * 提成审核页：搜索表单与列定义。
 * 列表复用提成单分页接口（销售与操作共用），审核视角只保留审核相关操作。
 */

const t = (key: string) => $t(`auditApproval.commissionReview.${key}`);

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

export const getCommissionTypeLabel = (value?: null | number): string => {
  if (value == null) return '-';
  return (
    getCommissionTypeOptions().find((o) => o.value === value)?.label ??
    String(value)
  );
};

// ==================== 搜索表单 ====================

export function useCommissionReviewFormSchema(): VbenFormSchema[] {
  const { CommissionOrderStatus: Status } = CommissionOrderAdminApi;
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
      label: t('commissionType'),
      componentProps: {
        allowClear: true,
        options: getCommissionTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      // 审核视角默认只看审核中的提成单，可手动清除查看全部
      defaultValue: Status.Submitted,
      fieldName: 'status',
      label: $t('commissionOrder.search.status'),
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
 * 提成审核页列定义（无操作列：详情由行双击打开，审核/驳回在表格上方工具栏批量操作）
 */
export function useCommissionReviewColumns(): VxeTableGridOptions<CommissionOrderAdminApi.CommissionOrderDto>['columns'] {
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
      title: t('commissionType'),
      minWidth: 100,
      cellRender: { name: 'CellTag', options: getCommissionTypeOptions() },
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
      field: 'status',
      title: $t('commissionOrder.columns.status'),
      minWidth: 110,
      cellRender: { name: 'CellTag', options: getStatusOptions() },
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
      field: 'submitUserName',
      title: $t('commissionOrder.columns.submitUser'),
      minWidth: 100,
    },
    {
      field: 'submitTime',
      title: $t('commissionOrder.detail.submitTime'),
      minWidth: 160,
      formatter: ({ cellValue }) => formatDateTimeText(cellValue),
    },
    {
      field: 'auditRemark',
      title: $t('commissionOrder.detail.auditRemark'),
      minWidth: 140,
      showOverflow: true,
    },
    {
      field: 'remark',
      title: $t('commissionOrder.columns.remark'),
      minWidth: 140,
      showOverflow: true,
    },
  ];
}
