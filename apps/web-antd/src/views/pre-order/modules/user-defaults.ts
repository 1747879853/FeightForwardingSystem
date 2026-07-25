import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { USER_ATTRIBUTE } from '../form-data';

export interface PreOrderUserRow extends PreOrderAdminApi.PreOrderUserDto {
  rowKey: string;
}

type ClientStakeholder = ClientAdminApi.ClientStakeholderDto;

/** 与海运出口一致的默认展示角色（海外客服不默认展示） */
export const DEFAULT_PRE_ORDER_USERS: Array<{
  sortId: number;
  userAttribute: number;
}> = [
  { userAttribute: USER_ATTRIBUTE.Sale, sortId: 6 },
  { userAttribute: USER_ATTRIBUTE.Business, sortId: 5 },
  { userAttribute: USER_ATTRIBUTE.Operation, sortId: 4 },
  { userAttribute: USER_ATTRIBUTE.CustomerService, sortId: 3 },
  { userAttribute: USER_ATTRIBUTE.Documentation, sortId: 2 },
];

let rowSeed = 0;
const createRowKey = () => `user-${Date.now()}-${(rowSeed += 1)}`;

export function createDefaultPreOrderUsers(): PreOrderUserRow[] {
  return DEFAULT_PRE_ORDER_USERS.map(
    (item) =>
      ({
        rowKey: createRowKey(),
        sortId: item.sortId,
        userAttribute: item.userAttribute as PreOrderAdminApi.UserAttribute,
      }) as PreOrderUserRow,
  );
}

/** 详情回填时补齐缺失的默认角色，并按默认顺序排序 */
export function mergeDefaultPreOrderUsers(
  items: PreOrderUserRow[],
): PreOrderUserRow[] {
  if (!items.length) return createDefaultPreOrderUsers();
  const present = new Set(items.map((item) => Number(item.userAttribute)));
  const missing = DEFAULT_PRE_ORDER_USERS.filter(
    (item) => !present.has(item.userAttribute),
  ).map(
    (item) =>
      ({
        rowKey: createRowKey(),
        sortId: item.sortId,
        userAttribute: item.userAttribute as PreOrderAdminApi.UserAttribute,
      }) as PreOrderUserRow,
  );
  const order = new Map(
    DEFAULT_PRE_ORDER_USERS.map((item, index) => [item.userAttribute, index]),
  );
  const rank = (attr?: number) =>
    attr != null && order.has(attr)
      ? (order.get(attr) as number)
      : DEFAULT_PRE_ORDER_USERS.length;
  return [...items, ...missing].sort(
    (a, b) => rank(a.userAttribute) - rank(b.userAttribute),
  );
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
