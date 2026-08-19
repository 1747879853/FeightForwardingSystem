import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

import { getCodePackagePagedList } from '#/api/system/base-data/code-package-admin';

import { createBizSelectCache } from './create-biz-select-cache';

const CODE_PACKAGE_PAGE_SIZE = 1000;
const CODE_PACKAGE_CACHE_VERSION = 1;

async function fetchAllCodePackageList(): Promise<
  CodePackageAdminApi.CodePackageDto[]
> {
  const all: CodePackageAdminApi.CodePackageDto[] = [];
  let pageIndex = 1;

  for (;;) {
    const res = await getCodePackagePagedList({
      PageIndex: pageIndex,
      PageSize: CODE_PACKAGE_PAGE_SIZE,
    });
    const pageItems = res.items ?? [];
    all.push(...pageItems);

    const totalPages =
      typeof res.totalPages === 'number' && res.totalPages > 0
        ? res.totalPages
        : Math.ceil((res.totalCount ?? 0) / CODE_PACKAGE_PAGE_SIZE) || 1;

    if (pageItems.length < CODE_PACKAGE_PAGE_SIZE || pageIndex >= totalPages) {
      break;
    }
    pageIndex += 1;
    if (pageIndex > 50) break;
  }

  return all;
}

/** 包装类型全量缓存（CodePackageSelect 默认数据源） */
export const codePackageListCache =
  createBizSelectCache<CodePackageAdminApi.CodePackageDto>({
    name: 'code-package',
    version: CODE_PACKAGE_CACHE_VERSION,
    /** 每次 ensure 都静默刷新；有旧列表立刻返回，成功才覆盖 */
    staleTime: 0,
    fetchAll: fetchAllCodePackageList,
  });
