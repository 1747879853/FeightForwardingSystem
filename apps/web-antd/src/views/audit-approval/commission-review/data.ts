import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { TaskStatus } from '#/api/audit-approval/payment-review-admin';

import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';
import { getTaskStatusOptions } from '#/views/audit-approval/data';
import {
  formatAmount,
  formatDateTimeText,
  formatMonth,
  getStatusOptions,
} from '#/views/commission/data';

/**
 * 提成审核页：搜索表单与列定义。
 * 列表走待我审核列表（从工作流反查当前登录人，不过数据权限），
 * 审核岗若用普通分页列表会漏掉该自己审的单子。
 */

/** 审核页行：提成单信息平铺 + 任务级字段（id 即提成单id，审核/驳回接口传它） */
export type CommissionReviewRow = CommissionOrderAdminApi.CommissionOrderDto & {
  /** 任务id，不是提成单id */
  taskId: string;
  /** 整个任务的状态 */
  taskStatus?: null | TaskStatus;
  /** 我这一级的状态，为空=还没轮到我或被或签置空 */
  myStatus?: null | TaskStatus;
};

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
      // 待我审核列表入参叫 commissionUserId，不叫 userId，避免与审核人混淆
      fieldName: 'commissionUserId',
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
      // 审核视角默认只看审核中的提成单，可手动清除查看全部（含审核通过以便审核后驳回）
      defaultValue: Status.Submitted,
      fieldName: 'commissionOrderStatus',
      label: $t('commissionOrder.search.status'),
      componentProps: {
        allowClear: true,
        options: getStatusOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'taskStatus',
      label: $t('auditApproval.task.status'),
      componentProps: {
        allowClear: true,
        options: getTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'myStatus',
      label: t('myStatus'),
      componentProps: {
        allowClear: true,
        options: getTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
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
export function useCommissionReviewColumns(): VxeTableGridOptions<CommissionReviewRow>['columns'] {
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
      field: 'myStatus',
      title: t('myStatus'),
      minWidth: 110,
      // 为空=还没轮到我或被或签置空，按状态筛会把这些单子漏掉，不传时后端照样返回
      cellRender: { name: 'CellTag', options: getTaskStatusOptions() },
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
