import type { SortItem } from '#/utils/paged-list-query';

import { reactive } from 'vue';

/** 同 tab 内存排序会话，刷新页面后清空 */
const sortSessionMap = reactive<Record<string, SortItem[]>>({});

export function getSortSessionList(listKey: string): SortItem[] {
  return sortSessionMap[listKey] ? [...sortSessionMap[listKey]] : [];
}

export function setSortSessionList(listKey: string, sortList: SortItem[]) {
  if (!listKey) {
    return;
  }
  if (sortList.length === 0) {
    delete sortSessionMap[listKey];
    return;
  }
  sortSessionMap[listKey] = sortList.map((item) => ({ ...item }));
}

export function clearSortSessionList(listKey: string) {
  if (!listKey) {
    return;
  }
  delete sortSessionMap[listKey];
}
