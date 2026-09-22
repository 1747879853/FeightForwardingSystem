import type { ClientAdminApi } from '#/api/sea-export/client-admin';

/**
 * 取当前登录人待审核的那条工作流明细 id。
 * 会签同级只能转自己那一条；找不到返回 undefined。
 */
export function findMyPendingWorkFlowItemId(
  instance?: ClientAdminApi.ClientWorkFlowInstanceDto | null,
  userId?: null | number | string,
): string | undefined {
  if (!instance || userId === undefined || userId === null || userId === '') {
    return undefined;
  }
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return undefined;

  for (const group of instance.levelGroup ?? []) {
    for (const item of group.itemList ?? []) {
      if (item.taskStatus === 0 && Number(item.userId) === uid && item.id) {
        return item.id;
      }
    }
  }
  return undefined;
}
