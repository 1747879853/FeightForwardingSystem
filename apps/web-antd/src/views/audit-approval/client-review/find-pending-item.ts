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
  const uid = String(userId);

  for (const group of instance.levelGroup ?? []) {
    for (const item of group.itemList ?? []) {
      // taskStatus：0 待审；兼容数字/字符串
      const pending = Number(item.taskStatus) === 0;
      if (pending && String(item.userId) === uid && item.id) {
        return item.id;
      }
    }
  }
  return undefined;
}
