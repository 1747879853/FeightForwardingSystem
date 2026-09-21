import { ClientAdminApi } from '#/api/sea-export/client-admin';

export const ClientStatus = ClientAdminApi.ClientStatus;
export type ClientStatus = ClientAdminApi.ClientStatus;

type MaybeStatus = ClientStatus | null | undefined;

/** 客户审核状态选项（列表筛选 / 列 Tag / 审核页共用） */
export function getClientStatusOptions() {
  return [
    {
      value: ClientStatus.NotSubmitted,
      label: '未提交',
      color: 'default' as const,
    },
    {
      value: ClientStatus.Auditing,
      label: '待审核',
      color: 'processing' as const,
    },
    { value: ClientStatus.Passed, label: '已通过', color: 'success' as const },
    { value: ClientStatus.Rejected, label: '已驳回', color: 'error' as const },
    {
      value: ClientStatus.ModifyAuditing,
      label: '申请修改',
      color: 'warning' as const,
    },
    {
      value: ClientStatus.ModifyRejected,
      label: '申请修改驳回',
      color: 'error' as const,
    },
  ];
}

export function getClientStatusLabel(status: MaybeStatus): string {
  return (
    getClientStatusOptions().find((item) => item.value === status)?.label ?? ''
  );
}

/**
 * 可直接编辑：未提交(0) 与 已驳回(3)。
 * 其余状态后端会拦「不可直接编辑,请发起申请修改」。
 */
export function canEditClient(status: MaybeStatus): boolean {
  return (
    status === ClientStatus.NotSubmitted || status === ClientStatus.Rejected
  );
}

/** 可提交审核：与可编辑同权（0 / 3） */
export function canSubmitClientAudit(status: MaybeStatus): boolean {
  return canEditClient(status);
}

/** 可申请修改：已通过(2) 与 申请修改驳回(5) */
export function canApplyClientModify(status: MaybeStatus): boolean {
  return (
    status === ClientStatus.Passed || status === ClientStatus.ModifyRejected
  );
}

/** 可撤回：待审核(1) 与 申请修改(4) */
export function canWithdrawClientAudit(status: MaybeStatus): boolean {
  return (
    status === ClientStatus.Auditing || status === ClientStatus.ModifyAuditing
  );
}
