/**
 * 运价批量新增/编辑跨页暂存。
 *
 * 列表「批量新增 / 更新 / AI 识别」跳转到 Tab 页时，用模块级内存传递行数据，
 * 避免塞进 URL；消费后清除，防止 KeepAlive 重复灌入。
 */
export type FreightBatchPendingPayload = {
  /** Handsontable 回填行（新增 AI / 更新选中行） */
  aiData?: any[];
  /** true = 批量编辑已有运价 */
  isEditMode?: boolean;
};

let pending: FreightBatchPendingPayload | null = null;

export function setPendingFreightBatchRows(data: FreightBatchPendingPayload) {
  pending = data;
}

/** 读取并清除暂存；未写入则返回 null */
export function consumePendingFreightBatchRows(): FreightBatchPendingPayload | null {
  const data = pending;
  pending = null;
  return data;
}
