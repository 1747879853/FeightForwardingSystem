import type { Router } from 'vue-router';

import { message } from 'ant-design-vue';

import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';

import { parseOrderFeeIdsFromQuery } from '../payment-application/prefill-from-order-fee-ids';

export { parseOrderFeeIdsFromQuery };

export interface InvoicePrefillResult {
  /** 回捞到的可开票费用 id（以接口返回为准，可能少于请求 id 数） */
  feeIds: string[];
  requestedCount: number;
}

/**
 * 按费用 id 回捞可开票明细（GetOrderFeeGroupAsync + OrderFeeIds）。
 * 返回条数以接口为准：费用须审核通过、未锁票、无在审任务且仍有剩余可开票额度。
 * 分页单位是业务（TransportOrder），回捞须放大 pageSize 上限，避免跨多票业务时被截断。
 */
export async function fetchOrderFeesForInvoiceApplication(
  feeIds: string[],
): Promise<InvoicePrefillResult> {
  const uniqueIds = [...new Set(feeIds.map(String))];
  const result = await InvoiceApplicationApi.getOrderFeeGroupAsync({
    orderFeeIds: uniqueIds,
    pageIndex: 1,
    pageSize: 100_000,
  });
  const matchedFeeIds = (result.items ?? []).flatMap((group) =>
    (group.orderFees ?? []).map((fee) => String(fee.id)),
  );
  return { feeIds: matchedFeeIds, requestedCount: uniqueIds.length };
}

/** 回捞后提示部分费用不可开票；无可开票费用时返回 false */
export function notifyInvoicePrefillResult(
  result: InvoicePrefillResult,
): boolean {
  const { feeIds, requestedCount } = result;
  if (feeIds.length === 0) {
    message.warning(
      '所选费用均不可开票，请确认费用已审核通过、未被锁定开票、无在审任务，且仍有剩余可开票额度',
    );
    return false;
  }
  if (feeIds.length < requestedCount) {
    message.warning(
      `共选择 ${requestedCount} 条费用，${feeIds.length} 条可开票（须审核通过且有剩余额度），已带入可开票明细`,
    );
  }
  return true;
}

export function navigateToInvoiceApplicationFromOrderFees(
  router: Router,
  feeIds: string[],
) {
  router.push({
    path: '/fee-management/invoice-application/add',
    query: { orderFeeIds: feeIds.join(',') },
  });
}

/** 校验选中费用并回捞通过后跳转开票申请新增页 */
export async function tryOpenInvoiceApplicationFromSelectedFees(
  router: Router,
  feeIds: string[],
): Promise<boolean> {
  const uniqueIds = [...new Set(feeIds.map(String).filter(Boolean))];
  if (uniqueIds.length === 0) {
    message.warning('请先勾选已保存的费用');
    return false;
  }

  try {
    const result = await fetchOrderFeesForInvoiceApplication(uniqueIds);
    if (!notifyInvoicePrefillResult(result)) {
      return false;
    }
  } catch (error) {
    console.error('拉取可开票费用失败:', error);
    message.error('拉取可开票费用失败，请稍后重试');
    return false;
  }

  navigateToInvoiceApplicationFromOrderFees(router, uniqueIds);
  return true;
}
