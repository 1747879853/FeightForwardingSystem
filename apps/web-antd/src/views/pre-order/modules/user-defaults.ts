import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import { USER_ATTRIBUTE } from '../form-data';

export interface PreOrderUserRow extends PreOrderAdminApi.PreOrderUserDto {
  rowKey: string;
}

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
