import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { getUserSimplePagedList } from '#/api/system/user-admin';

import { createBizSelectCache } from './create-biz-select-cache';

const USER_SIMPLE_PAGE_SIZE = 1000;
const USER_SIMPLE_CACHE_VERSION = 2;

async function fetchAllUserSimpleList(): Promise<
  SystemUserAdminApi.UserSimpleDto[]
> {
  const all: SystemUserAdminApi.UserSimpleDto[] = [];
  let pageIndex = 1;

  for (;;) {
    const res = await getUserSimplePagedList({
      pageIndex,
      pageSize: USER_SIMPLE_PAGE_SIZE,
    });
    const pageItems = res.items ?? [];
    all.push(...pageItems);

    const totalPages =
      typeof res.totalPages === 'number' && res.totalPages > 0
        ? res.totalPages
        : Math.ceil((res.totalCount ?? 0) / USER_SIMPLE_PAGE_SIZE) || 1;

    if (pageItems.length < USER_SIMPLE_PAGE_SIZE || pageIndex >= totalPages) {
      break;
    }
    pageIndex += 1;
    if (pageIndex > 50) break;
  }

  return all;
}

/** 当前租户激活用户简易列表缓存（UserSelect 默认数据源） */
export const userSimpleListCache =
  createBizSelectCache<SystemUserAdminApi.UserSimpleDto>({
    name: 'user-simple',
    version: USER_SIMPLE_CACHE_VERSION,
    /** 每次 ensure 都静默刷新；有旧列表立刻返回，成功才覆盖 */
    staleTime: 0,
    fetchAll: fetchAllUserSimpleList,
  });
