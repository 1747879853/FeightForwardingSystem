import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { OrderUserRoleOption } from '#/composables/use-order-user-roles';

import { syncOrderUserRows } from '#/composables/use-order-user-roles';

import { USER_ATTRIBUTE } from '../form-data';

export interface PreOrderUserRow extends PreOrderAdminApi.PreOrderUserDto {
  rowKey: string;
}

type ClientStakeholder = ClientAdminApi.ClientStakeholderDto;

let rowSeed = 0;
const createRowKey = () => `user-${Date.now()}-${(rowSeed += 1)}`;

/**
 * 按当前业务类型的角色配置整理干系人行：补齐默认展示角色、按枚举顺序排列。
 * @param dropUnknownRoles 业务类型切换后剔除新枚举里不存在的角色（销售等固定角色始终在枚举内）
 */
export function syncPreOrderUserRows(
  rows: PreOrderUserRow[],
  roles: OrderUserRoleOption[],
  dropUnknownRoles = false,
): PreOrderUserRow[] {
  const synced = syncOrderUserRows({
    createRow: (userAttribute) =>
      ({
        rowKey: createRowKey(),
        userAttribute: userAttribute as PreOrderAdminApi.UserAttribute,
      }) as PreOrderUserRow,
    dropUnknownRoles,
    getUserAttribute: (row) =>
      row.userAttribute == null ? undefined : Number(row.userAttribute),
    roles,
    rows,
  });
  // 排序即优先级：越靠前 sortId 越大，口径与海运出口一致
  return synced.map((row, index) => ({
    ...row,
    sortId: synced.length - index,
  }));
}

/** 取客户「默认」干系人；无默认时取列表第一个 */
function pickDefaultClientStakeholder(list?: ClientStakeholder[]) {
  if (!list?.length) return undefined;
  return list.find((item) => item.isDefault) ?? list[0];
}

/**
 * 依据委托单位已绑定干系人回填面板（对齐海运出口）：
 * - 销售/客服/操作/单证：取客户「默认」干系人（无默认取第一个）
 * - 操作/单证/客服：客户未绑定时，兜底填当前登录账号
 * - 商务/海外客服等不在客户维度维护，保持原值不动
 */
export function applyClientDefaultPreOrderUsers(
  rows: PreOrderUserRow[],
  client?: ClientAdminApi.ClientDto,
  currentUserId?: number,
): PreOrderUserRow[] {
  const roleAssignment = new Map<number, number>();
  const assignFromClient = (role: number, list?: ClientStakeholder[]) => {
    const picked = pickDefaultClientStakeholder(list);
    if (picked?.userId) {
      roleAssignment.set(role, picked.userId);
    }
  };
  assignFromClient(USER_ATTRIBUTE.Sale, client?.sales);
  assignFromClient(USER_ATTRIBUTE.CustomerService, client?.customerServices);
  assignFromClient(USER_ATTRIBUTE.Operation, client?.operations);
  assignFromClient(USER_ATTRIBUTE.Documentation, client?.documentations);
  if (currentUserId != null) {
    for (const role of [
      USER_ATTRIBUTE.Operation,
      USER_ATTRIBUTE.Documentation,
      USER_ATTRIBUTE.CustomerService,
    ]) {
      if (!roleAssignment.has(role)) {
        roleAssignment.set(role, currentUserId);
      }
    }
  }
  if (!roleAssignment.size) return rows;
  return rows.map((row) => {
    if (row.userAttribute == null) return row;
    const targetUserId = roleAssignment.get(Number(row.userAttribute));
    if (targetUserId == null) return row;
    return { ...row, userId: targetUserId };
  });
}
