/**
 * 发票开出「组合状态」(combinedStatus) 共享映射。
 *
 * 规则（见《诺诺开票模块总逻辑文档》3.6 与《发票开出接口文档》第五节）：
 * - 未冲红时 combinedStatus = 开票状态 issueStatus 原值（0/1/2/3/20/21/22/24/31）；
 * - 已发起冲红时 combinedStatus = 红冲状态 redStatus + 100（101~116、199）；
 * - 未冲红(0) 不会作为组合值返回，因此没有 100。
 *
 * 列表状态列、编辑页详情、详情弹窗统一绑这个字段，
 * 不要各自拿 issueStatus + redStatus 再拼一遍（后端也是同一份规则算出来的）。
 */

/** 组合状态 → 中文标签（覆盖开票段与冲红段） */
export function getCombinedStatusLabel(status?: null | number): string {
  if (status === undefined || status === null) return '-';

  const map: Record<number, string> = {
    // ===== 开票段（未冲红，等于 issueStatus） =====
    0: '未开票',
    1: '开票中', // 已提交待开票
    2: '开票完成',
    3: '已作废',
    20: '开票中',
    21: '签章中',
    22: '开票失败',
    24: '签章失败',
    31: '作废中',

    // ===== 冲红段（已冲红，等于 redStatus + 100） =====
    101: '冲红中·无需确认',
    102: '冲红中·待购方确认',
    103: '冲红中·待销方确认',
    104: '冲红中·已确认待开红票',
    105: '冲红失败',
    106: '冲红失败',
    107: '冲红失败',
    108: '冲红失败',
    109: '冲红失败',
    110: '冲红失败',
    111: '冲红失败',
    115: '冲红申请中',
    116: '冲红失败',
    199: '已冲红',
  };

  return map[status] || String(status);
}

/** 组合状态 → Tag 颜色（开票完成绿、失败红、进行中蓝、冲红中橙、已冲红红） */
export function getCombinedStatusColor(status?: null | number): string {
  if (status === undefined || status === null) return 'default';

  // 开票段
  if (status === 2) return 'success'; // 开票完成
  if (status === 24) return 'warning'; // 签章失败（票已开出）
  if (status === 22) return 'error'; // 开票失败
  if ([1, 20, 21, 31].includes(status)) return 'processing'; // 开票中/签章中/作废中
  if (status === 0 || status === 3) return 'default'; // 未开票/已作废

  // 冲红段
  if (status === 199) return 'red'; // 已冲红
  if (status === 116 || (status >= 105 && status <= 111)) return 'error'; // 冲红失败/确认单作废
  if (status === 115 || (status >= 101 && status <= 104)) return 'orange'; // 冲红中

  return 'default';
}

/**
 * 列表筛选：发票状态逻辑分组选项。
 * 单值代表一段流程（如「开票中」跨 1/20/21），查询时经 expandCombinedStatusGroup
 * 展开成 combinedStatuses 数组传给后端（多选之间是 OR）。
 */
export const combinedStatusFilterOptions = [
  { label: '未开票', value: 'notIssued' },
  { label: '开票中', value: 'issuing' },
  { label: '开票完成', value: 'issued' },
  { label: '签章失败', value: 'signFailed' },
  { label: '开票失败', value: 'issueFailed' },
  { label: '已作废/作废中', value: 'voided' },
  { label: '冲红中', value: 'redIng' },
  { label: '冲红失败', value: 'redFailed' },
  { label: '已冲红', value: 'redDone' },
];

/** 逻辑分组 → combinedStatuses 数组（见对接文档 3.6 / 第五节筛选说明） */
const combinedStatusGroupMap: Record<string, number[]> = {
  notIssued: [0],
  issuing: [1, 20, 21],
  issued: [2],
  signFailed: [24],
  issueFailed: [22],
  voided: [3, 31],
  redIng: [115, 101, 102, 103, 104],
  redFailed: [105, 106, 107, 108, 109, 110, 111, 116],
  redDone: [199],
};

/** 把筛选选中的逻辑分组展开成 combinedStatuses 数组；未选返回 undefined */
export function expandCombinedStatusGroup(
  group?: string,
): number[] | undefined {
  if (!group) return undefined;
  return combinedStatusGroupMap[group];
}
