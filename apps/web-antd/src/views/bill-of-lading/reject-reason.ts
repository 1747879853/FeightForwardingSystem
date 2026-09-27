import type { BillOfLading } from '#/api/bill-of-lading';

import { getBillTask } from '#/api/bill-of-lading';

export interface RejectReason {
  /** 已经拿到这张提单的审核意见。空字符串表示审核人没填 */
  known: boolean;
  remark: string;
  time: string;
  userName: string;
}

const cache = new Map<string, RejectReason>();

export function rejectMeta(reason?: null | RejectReason) {
  const name = reason?.userName?.trim();
  const time = reason?.time ? reason.time.replace('T', ' ').slice(0, 19) : '';
  return [name, time].filter(Boolean).join(' · ');
}

export function rejectReasonText(
  reason?: null | RejectReason,
  loading = false,
) {
  if (loading || !reason) return '读取中';
  if (!reason.known) return '未能读取';
  return reason.remark || '未填写';
}

/** 已驳回时从现有审核任务详情读取这张提单的审核意见。提单列表和详情接口没有这个字段。 */
export async function loadRejectReason(
  bill: BillOfLading,
  canReadTask: boolean,
): Promise<RejectReason | undefined> {
  if (bill.status !== 2) return undefined;

  const key = String(bill.id);
  const hit = cache.get(key);
  if (hit) return hit;
  if (!canReadTask || !bill.taskBaseId) {
    return { known: false, remark: '', time: '', userName: '' };
  }

  try {
    const task = await getBillTask(String(bill.taskBaseId));
    const item = task.billOfLadingTasks?.find(
      (row) => String(row.billOfLading?.id) === key,
    );
    const reason: RejectReason = {
      known: true,
      remark: item?.remark?.trim() ?? '',
      time: item?.auditTime ?? '',
      userName: item?.auditUserName?.trim() ?? '',
    };
    cache.set(key, reason);
    return reason;
  } catch {
    return { known: false, remark: '', time: '', userName: '' };
  }
}
