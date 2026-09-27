import type { BillOfLading } from '#/api/bill-of-lading';

export interface RejectReason {
  remark: string;
  time: string;
  userName: string;
}

export function rejectMeta(reason?: null | RejectReason) {
  const name = reason?.userName?.trim();
  const time = reason?.time ? reason.time.replace('T', ' ').slice(0, 19) : '';
  return [name, time].filter(Boolean).join(' · ');
}

export function rejectReasonText(reason?: null | RejectReason) {
  if (!reason) return '';
  return reason.remark || '未填写';
}

/** 已驳回时直接用列表/详情带回的最近一次签出审核意见，不再另请求审核任务。 */
export function rejectReasonOf(bill: BillOfLading): RejectReason | undefined {
  if (bill.status !== 2) return undefined;
  return {
    remark: bill.auditRemark?.trim() ?? '',
    time: bill.auditTime ?? '',
    userName: bill.auditUserName?.trim() ?? '',
  };
}
