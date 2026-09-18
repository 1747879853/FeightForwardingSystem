/**
 * 费用列表展示顺序：sortId 升序，相同再按 creationTime 升序。
 * 与后端无 sorting 入参的嵌套费用清单、以及打印强制排序口径一致。
 */
export function compareOrderFeeSort(
  a: { creationTime?: null | string; sortId?: null | number },
  b: { creationTime?: null | string; sortId?: null | number },
): number {
  const sortA = Number(a.sortId ?? 0);
  const sortB = Number(b.sortId ?? 0);
  if (sortA !== sortB) {
    return sortA - sortB;
  }
  const timeA = a.creationTime ? Date.parse(a.creationTime) : 0;
  const timeB = b.creationTime ? Date.parse(b.creationTime) : 0;
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return 0;
}

export function sortOrderFeeList<T extends { creationTime?: null | string; sortId?: null | number }>(
  items: T[],
): T[] {
  return [...items].sort(compareOrderFeeSort);
}

/** 按当前数组下标回写 sortId（0..n-1） */
export function applySequentialSortIds<T extends { sortId?: number }>(
  items: T[],
): T[] {
  items.forEach((row, index) => {
    row.sortId = index;
  });
  return items;
}
