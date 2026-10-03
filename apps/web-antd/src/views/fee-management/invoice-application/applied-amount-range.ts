/**
 * 开票申请费用明细金额区间。
 * 正数费用：[−其他申请已占用, 剩余可开票]；负数费用把区间反过来。
 * 其他申请已占用 ≈ 费用金额 − 剩余可开票（与 GetOrderFeeGroup 的剩余口径一致）。
 * 已按发票收费结算的下限前端拿不到，交给后端校验。
 */

export interface AppliedAmountBounds {
  /** 费用金额 < 0 */
  negativeFee: boolean;
  min: number;
  max: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isNegativeMoney(value: unknown): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount < 0;
}

export function getAppliedAmountBounds(
  feeAmount: unknown,
  remaining: unknown,
): AppliedAmountBounds {
  const amount = Number(feeAmount);
  const remain = Number(remaining);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeRemain = Number.isFinite(remain) ? remain : 0;
  const negativeFee = safeAmount < 0;
  const otherEdge = roundMoney(safeRemain - safeAmount);
  if (negativeFee) {
    return {
      negativeFee: true,
      min: roundMoney(safeRemain),
      max: otherEdge,
    };
  }
  return {
    negativeFee: false,
    min: otherEdge,
    max: roundMoney(safeRemain),
  };
}

/** 超出区间时返回与后端一致的提示；合法则返回空 */
export function appliedAmountRangeMessage(
  applied: unknown,
  feeAmount: unknown,
  remaining: unknown,
): string | null {
  const value = Number(applied);
  if (!Number.isFinite(value)) {
    return '请填写本次申请金额';
  }
  const bounds = getAppliedAmountBounds(feeAmount, remaining);
  if (value < bounds.min - 0.001) {
    const limit = bounds.min.toFixed(2);
    return bounds.negativeFee
      ? `费用剩余可开票额度不足,可用额度:${limit}`
      : `费用冲红额度不足,最小可用额度:${limit}`;
  }
  if (value > bounds.max + 0.001) {
    const limit = bounds.max.toFixed(2);
    return bounds.negativeFee
      ? `费用冲红额度不足,最大可用额度:${limit}`
      : `费用剩余可开票额度不足,可用额度:${limit}`;
  }
  return null;
}
