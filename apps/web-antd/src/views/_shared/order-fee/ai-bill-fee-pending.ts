import type {
  GeminiBillFeeOrderFeeDto,
  GeminiBillFeeTransportOrderDto,
} from '#/api/sea-export/gemini-admin';

/**
 * 列表页「AI 识别账单费用」跨页暂存。
 *
 * 场景：在海运出口/进口/空运出口**列表页**上传账单，识别出提单号并匹配到某一票业务后，
 * 需要跳转到该业务详情的「应收应付」费用页，并把已识别出的费用一并带过去，
 * 由费用页（应付表）自动弹出确认弹窗供用户勾选添加，避免用户二次上传、二次等待 AI。
 *
 * 由于跳转是同一次 SPA 会话内的编程式导航（router.push），用一个模块级内存单例即可，
 * 无需序列化到 sessionStorage；按 transportOrderId 精确匹配、读取即清除，避免重复消费。
 */
export interface PendingBillFees {
  /** 目标业务 id，费用页据此判断是否是自己要消费的暂存 */
  transportOrderId: string;
  /** 识别匹配到的业务（用于确认弹窗展示委托编号/主提单号） */
  transportOrder: GeminiBillFeeTransportOrderDto;
  /** 识别出的费用添加列表（paySide 均为应付） */
  orderFees: GeminiBillFeeOrderFeeDto[];
}

let pendingBillFees: null | PendingBillFees = null;

/** 列表页识别成功后写入暂存，随后跳转到对应费用页 */
export function setPendingBillFees(data: PendingBillFees) {
  pendingBillFees = data;
}

/**
 * 费用页（应付表）挂载/切票时按业务 id 读取并清除暂存。
 * @param transportOrderId 当前费用页业务 id
 * @returns 命中返回暂存数据（已清除），未命中返回 null
 */
export function consumePendingBillFees(
  transportOrderId?: string,
): null | PendingBillFees {
  if (!transportOrderId || !pendingBillFees) return null;
  if (pendingBillFees.transportOrderId !== transportOrderId) return null;
  const data = pendingBillFees;
  pendingBillFees = null;
  return data;
}
