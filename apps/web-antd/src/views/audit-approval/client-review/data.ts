import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';

import dayjs from 'dayjs';

import { ClientAdminApi } from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { getClientStatusOptions } from '#/views/client/base/client-status';

const { ClientTaskStatus, ClientTaskType } = ClientAdminApi;

type ClientTaskRow = ClientAdminApi.ClientTaskDto;

/** 任务类型：客户提交 / 客户申请修改 */
export function getClientTaskTypeOptions() {
  return [
    {
      value: ClientTaskType.SubmitClient,
      label: '客户提交',
      color: 'processing' as const,
    },
    {
      value: ClientTaskType.ModifyClient,
      label: '客户申请修改',
      color: 'warning' as const,
    },
  ];
}

/** 任务状态（与我的审核状态同一套取值，语义随列不同） */
export function getClientTaskStatusOptions() {
  return [
    {
      value: ClientTaskStatus.Auditing,
      label: '审核中',
      color: 'processing' as const,
    },
    {
      value: ClientTaskStatus.Rejected,
      label: '审核驳回',
      color: 'error' as const,
    },
    {
      value: ClientTaskStatus.Passed,
      label: '审核通过',
      color: 'success' as const,
    },
  ];
}

/** 我在这条任务上的状态；null 代表还没轮到我 */
export function getMyTaskStatusOptions() {
  return [
    {
      value: ClientTaskStatus.Auditing,
      label: '待我审核',
      color: 'processing' as const,
    },
    {
      value: ClientTaskStatus.Rejected,
      label: '我已驳回',
      color: 'error' as const,
    },
    {
      value: ClientTaskStatus.Passed,
      label: '我已通过',
      color: 'success' as const,
    },
  ];
}

/** 筛选用「我的审核状态」只有待我审核与我已审核两项（后端 myAuditStatus 只认 0 / 2） */
export function getMyAuditStatusFilterOptions() {
  return [
    { value: ClientTaskStatus.Auditing, label: '待我审核' },
    { value: ClientTaskStatus.Passed, label: '我已审核' },
  ];
}

export function getClientTaskTypeLabel(taskType?: null | number): string {
  return (
    getClientTaskTypeOptions().find((item) => item.value === taskType)?.label ??
    ''
  );
}

export function getMyTaskStatusLabel(status?: null | number): string {
  if (status === null || status === undefined) return '未轮到我';
  return (
    getMyTaskStatusOptions().find((item) => item.value === status)?.label ?? ''
  );
}

/** 表单的提交时间区间拆成后端的起止两个参数 */
export function mapClientReviewParams(formValues: Record<string, any>) {
  const { submitTimeRange, ...rest } = formValues;
  const [start, end] = Array.isArray(submitTimeRange) ? submitTimeRange : [];
  const toDate = (value: unknown) => {
    if (!value) return undefined;
    const date = dayjs(value as string);
    return date.isValid() ? date.format('YYYY-MM-DD') : undefined;
  };
  return {
    ...rest,
    submitTimeStart: toDate(start),
    submitTimeEnd: toDate(end),
  };
}

export function useClientReviewFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'myAuditStatus',
      label: $t('auditApproval.clientReview.myStatus'),
      // 默认只看待我审核，与其他审核页默认「审核中」口径一致
      defaultValue: ClientTaskStatus.Auditing,
      componentProps: {
        allowClear: true,
        options: getMyAuditStatusFilterOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'taskType',
      label: $t('auditApproval.task.type'),
      componentProps: {
        allowClear: true,
        options: getClientTaskTypeOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'taskStatus',
      label: $t('auditApproval.task.status'),
      componentProps: {
        allowClear: true,
        options: getClientTaskStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'Select',
      fieldName: 'clientStatus',
      label: $t('auditApproval.clientReview.clientStatus'),
      componentProps: {
        allowClear: true,
        options: getClientStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'TrimInput',
      fieldName: 'keyword',
      label: $t('seaExport.client.keyword'),
      componentProps: {
        allowClear: true,
        placeholder: '客户简称/代码/全称/英文名',
      },
    },
    {
      component: 'UserCompanySelect',
      fieldName: 'orgId',
      label: '归属公司',
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
    {
      component: 'RangePicker',
      fieldName: 'submitTimeRange',
      label: '提交时间',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        placeholder: ['开始日期', '结束日期'],
      },
    },
  ];
}

export function useClientReviewColumns(): VxeTableGridOptions<ClientTaskRow>['columns'] {
  return [
    { type: 'checkbox', width: 48, fixed: 'left', align: 'center' },
    {
      field: 'client.name',
      title: $t('seaExport.client.clientName'),
      minWidth: 140,
      fixed: 'left',
    },
    {
      field: 'client.code',
      title: $t('seaExport.client.code'),
      minWidth: 100,
    },
    {
      field: 'client.fullName',
      title: $t('seaExport.client.fullName'),
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'taskType',
      title: $t('auditApproval.task.type'),
      minWidth: 120,
      align: 'center',
      cellRender: { name: 'CellTag', options: getClientTaskTypeOptions() },
    },
    {
      field: 'taskStatus',
      title: $t('auditApproval.task.status'),
      minWidth: 100,
      align: 'center',
      cellRender: { name: 'CellTag', options: getClientTaskStatusOptions() },
    },
    {
      field: 'myTaskStatus',
      title: $t('auditApproval.clientReview.myStatus'),
      minWidth: 110,
      align: 'center',
      formatter: ({ cellValue }) => getMyTaskStatusLabel(cellValue),
    },
    {
      field: 'client.clientStatus',
      title: $t('auditApproval.clientReview.clientStatus'),
      minWidth: 120,
      align: 'center',
      cellRender: { name: 'CellTag', options: getClientStatusOptions() },
    },
    {
      field: 'submitTime',
      title: '提交时间',
      minWidth: 150,
      formatter: 'formatDateTime',
    },
    {
      field: 'submitUserName',
      title: '提交人',
      minWidth: 100,
    },
    {
      field: 'applyRemark',
      title: '申请修改原因',
      minWidth: 180,
      showOverflow: true,
      formatter: ({ cellValue }) => cellValue || '--',
    },
    {
      field: 'auditTime',
      title: $t('auditApproval.task.auditTime'),
      minWidth: 150,
      formatter: 'formatDateTime',
    },
    {
      field: 'auditUserName',
      title: $t('auditApproval.task.auditUserName'),
      minWidth: 100,
      formatter: ({ cellValue }) => cellValue || '--',
    },
    {
      field: 'remark',
      title: $t('auditApproval.task.AuditRemark'),
      minWidth: 180,
      showOverflow: true,
      formatter: ({ cellValue }) => cellValue || '--',
    },
    {
      field: 'client.orgs',
      title: '归属公司',
      minWidth: 150,
      formatter: ({ row }) => row.client?.orgs?.at(-1)?.name || '--',
    },
  ];
}
