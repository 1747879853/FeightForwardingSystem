import type { RouteLocationNormalizedLoaded } from 'vue-router';

import { message } from 'ant-design-vue';

import { getOrderFeeGroupAsync } from '#/api/settlement-management/payment-application-admin';

import {
  flattenPayAppFeeGroupsToSelectedItems,
  type SelectedFeeItem,
} from '../add-fee-modal/data';

/** 从路由 query 解析 orderFeeIds（逗号分隔或数组） */
export function parseOrderFeeIdsFromQuery(
  query: RouteLocationNormalizedLoaded['query'],
): string[] {
  const raw = query.orderFeeIds;
  if (raw == null || raw === '') return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  return parts
    .flatMap((item) => String(item).split(','))
    .map((id) => id.trim())
    .filter(Boolean);
}

export interface PrefillOrderFeesResult {
  items: SelectedFeeItem[];
  requestedCount: number;
}

/**
 * 按费用 id 回捞可申请明细（GetOrderFeeGroupAsync + OrderFeeIds）。
 * 返回条数以接口为准，可能少于请求 id 数。
 */
export async function fetchOrderFeesForPaymentApplication(
  feeIds: string[],
): Promise<PrefillOrderFeesResult> {
  const uniqueIds = [...new Set(feeIds.map(String))];
  const result = await getOrderFeeGroupAsync({
    OrderFeeIds: uniqueIds,
    PageIndex: 1,
    PageSize: 100_000,
  });
  const items = flattenPayAppFeeGroupsToSelectedItems(result.items ?? [], {
    feeIds: uniqueIds,
  });
  return { items, requestedCount: uniqueIds.length };
}

/** 回捞后提示部分费用不可申请；无可申请费用时返回 false */
export function notifyPrefillOrderFeesResult(
  result: PrefillOrderFeesResult,
): boolean {
  const { items, requestedCount } = result;
  if (items.length === 0) {
    message.warning(
      '所选费用均不可申请付费，请确认费用已审核通过、无申请修改/删除在审，且仍有可申请额度',
    );
    return false;
  }
  if (items.length < requestedCount) {
    message.warning(
      `共选择 ${requestedCount} 条费用，${items.length} 条可申请（须审核通过且有剩余额度），已带入可申请明细`,
    );
  }
  return true;
}
