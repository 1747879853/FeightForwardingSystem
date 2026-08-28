import type { Router } from 'vue-router';

import { message } from 'ant-design-vue';

import {
  fetchOrderFeesForPaymentApplication,
  notifyPrefillOrderFeesResult,
} from './prefill-from-order-fee-ids';

/** 与后端 FeeStatus.Passed / CombinedFeeStatus.Passed 一致 */
export const ORDER_FEE_COMBINED_STATUS_PASSED = 2;

/** 部分结算：底层仍为审核通过，可能仍有付费申请额度 */
export const ORDER_FEE_COMBINED_STATUS_PARTIAL_SETTLEMENT = 3;

/** 申请修改：库里 FeeStatus 仍为 Passed(2)，但存在待审修改任务 */
export const ORDER_FEE_COMBINED_STATUS_MODIFICATION = 6;

/** 申请删除：同上，存在待审删除任务 */
export const ORDER_FEE_COMBINED_STATUS_DELETION = 7;

/** 任务项：审核中（与后端 TaskStatus.Auditing 一致） */
const ORDER_FEE_TASK_STATUS_AUDITING = 0;

type OrderFeeTaskItemLike = { taskStatus?: number };

/** 应收应付页勾选费用跳转付费申请时的字段 */
export interface OrderFeeForPaymentNav {
  id: string;
  paySide?: number;
  settlementId?: string;
  /** 库表 FeeStatus，申请修改/删除在审时仍可能为 2，不可单独用于付费校验 */
  feeStatus?: number;
  /** 页面组合费用状态，与后端 CombinedFeeStatus 一致 */
  combinedFeeStatus?: number;
  modifyOrderFeeTasks?: OrderFeeTaskItemLike[];
  deleteOrderFeeTasks?: OrderFeeTaskItemLike[];
  unRqstPaymentAmount?: number;
}

type OrderFeeLike = Pick<
  OrderFeeForPaymentNav,
  | 'combinedFeeStatus'
  | 'feeStatus'
  | 'modifyOrderFeeTasks'
  | 'deleteOrderFeeTasks'
  | 'unRqstPaymentAmount'
>;

type OrderFeeStatusSource = Pick<
  OrderFeeForPaymentNav,
  | 'combinedFeeStatus'
  | 'feeStatus'
  | 'modifyOrderFeeTasks'
  | 'deleteOrderFeeTasks'
>;

function normalizeStatusValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function hasPendingModifyTask(fee: OrderFeeStatusSource): boolean {
  return (
    fee.modifyOrderFeeTasks?.some(
      (task) => task.taskStatus === ORDER_FEE_TASK_STATUS_AUDITING,
    ) ?? false
  );
}

function hasPendingDeleteTask(fee: OrderFeeStatusSource): boolean {
  return (
    fee.deleteOrderFeeTasks?.some(
      (task) => task.taskStatus === ORDER_FEE_TASK_STATUS_AUDITING,
    ) ?? false
  );
}

/**
 * 取组合费用状态：
 * 1. 优先 combinedFeeStatus（后端 CombinedFeeStatus）
 * 2. 无组合状态时，用待审任务推断申请修改/删除
 * 3. 再回退 feeStatus（应收应付表加载后已映射为 2/3/4，与页面展示一致）
 */
export function resolveOrderFeeCombinedStatus(
  fee: OrderFeeStatusSource,
): number | undefined {
  const combined = normalizeStatusValue(fee.combinedFeeStatus);
  if (combined != null) return combined;

  if (hasPendingModifyTask(fee)) {
    return ORDER_FEE_COMBINED_STATUS_MODIFICATION;
  }
  if (hasPendingDeleteTask(fee)) {
    return ORDER_FEE_COMBINED_STATUS_DELETION;
  }

  return normalizeStatusValue(fee.feeStatus);
}

/**
 * 是否满足「可申请付费」的前端状态口径：
 * 组合状态为审核通过(2) 或 部分结算(3)。
 * 申请修改(6)/申请删除(7) 时库表 FeeStatus 仍为 Passed，须以组合状态为准。
 */
export function isOrderFeeApprovedForPayment(fee: OrderFeeLike): boolean {
  const status = resolveOrderFeeCombinedStatus(fee);
  return (
    status === ORDER_FEE_COMBINED_STATUS_PASSED ||
    status === ORDER_FEE_COMBINED_STATUS_PARTIAL_SETTLEMENT
  );
}

function buildIneligibleStatusMessage(
  notApproved: OrderFeeLike[],
  total: number,
): string {
  const statuses = new Set(
    notApproved.map((f) => resolveOrderFeeCombinedStatus(f)),
  );
  if (statuses.has(ORDER_FEE_COMBINED_STATUS_MODIFICATION)) {
    return notApproved.length === total
      ? '所选费用正在申请修改，请等待审批完成后再申请付费'
      : `有 ${notApproved.length} 条费用正在申请修改或状态不可申请，请重新勾选`;
  }
  if (statuses.has(ORDER_FEE_COMBINED_STATUS_DELETION)) {
    return notApproved.length === total
      ? '所选费用正在申请删除，请等待审批完成后再申请付费'
      : `有 ${notApproved.length} 条费用正在申请删除或状态不可申请，请重新勾选`;
  }
  if (notApproved.length === total) {
    return '只有审核通过（或部分结算且仍有额度）的费用可申请付费，请重新勾选';
  }
  return `有 ${notApproved.length} 条费用未审核通过，请仅选择审核通过的费用`;
}

/** 从应收/应付表格选中行收集跳转参数 */
export function collectOrderFeesForPaymentNav(
  recFees: Array<
    OrderFeeForPaymentNav & {
      id?: string;
    }
  >,
  payFees: Array<
    OrderFeeForPaymentNav & {
      id?: string;
    }
  >,
): OrderFeeForPaymentNav[] {
  return [...recFees, ...payFees]
    .filter((fee) => fee.id && String(fee.id).trim())
    .map((fee) => ({
      id: String(fee.id),
      paySide: fee.paySide,
      settlementId: fee.settlementId,
      feeStatus: fee.feeStatus,
      combinedFeeStatus: fee.combinedFeeStatus,
      modifyOrderFeeTasks: fee.modifyOrderFeeTasks,
      deleteOrderFeeTasks: fee.deleteOrderFeeTasks,
      unRqstPaymentAmount: fee.unRqstPaymentAmount,
    }));
}

/**
 * 校验勾选费用是否可跳转创建付费申请。
 * @returns 错误文案；通过则返回 null
 */
export function validateOrderFeesForPaymentApplication(
  fees: OrderFeeForPaymentNav[],
): null | string {
  if (fees.length === 0) {
    return '请先勾选已保存的费用';
  }

  const notApproved = fees.filter((f) => !isOrderFeeApprovedForPayment(f));
  if (notApproved.length > 0) {
    return buildIneligibleStatusMessage(notApproved, fees.length);
  }

  const noRemaining = fees.filter(
    (f) =>
      typeof f.unRqstPaymentAmount === 'number' && f.unRqstPaymentAmount <= 0,
  );
  if (noRemaining.length === fees.length) {
    return '所选费用无可申请额度，请检查是否已全部申请付费或已结算';
  }

  const settlementIds = new Set(
    fees
      .map((f) => f.settlementId)
      .filter((id): id is string => Boolean(id && String(id).trim()))
      .map(String),
  );
  if (settlementIds.size > 1) {
    return '所选费用结算对象不一致，请只选择同一结算对象的费用';
  }

  const hasPayable = fees.some((f) => f.paySide === 1);
  if (!hasPayable) {
    return '请至少选择一条应付费用';
  }

  return null;
}

export function navigateToPaymentApplicationFromOrderFees(
  router: Router,
  feeIds: string[],
) {
  router.push({
    path: '/fee-management/payment-application/add',
    query: { orderFeeIds: feeIds.join(',') },
  });
}

/** 校验并回捞通过后跳转付费申请新增页 */
export async function tryOpenPaymentApplicationFromSelectedFees(
  router: Router,
  fees: OrderFeeForPaymentNav[],
): Promise<boolean> {
  const error = validateOrderFeesForPaymentApplication(fees);
  if (error) {
    message.warning(error);
    return false;
  }

  const feeIds = fees.map((f) => String(f.id));
  const result = await fetchOrderFeesForPaymentApplication(feeIds);
  if (!notifyPrefillOrderFeesResult(result)) {
    return false;
  }

  navigateToPaymentApplicationFromOrderFees(router, feeIds);
  return true;
}
