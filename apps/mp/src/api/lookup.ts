import type { PagedResult } from './loading-order';
import type {
  CarrierListItem,
  CodeGoodsListItem,
  PortCodePagedItem,
} from '@/utils/lookup-options';

import { request } from './request';

export interface LookupPageQuery {
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
  sorting?: string;
}

function pageParams(query: LookupPageQuery = {}) {
  return {
    pageIndex: query.pageIndex ?? 1,
    pageSize: query.pageSize ?? 20,
    keyword: query.keyword?.trim() || undefined,
    sorting: query.sorting,
  };
}

/** 登录即可。与 PC PortSelect 同一接口，才能拿到 EDI/英文名/国家/中文名 */
export function getPortCodePagedList(query: LookupPageQuery = {}) {
  return request<PagedResult<PortCodePagedItem>>({
    url: '/services/app/PortCodeAdmin/GetPagedListAsync',
    params: pageParams({
      ...query,
      sorting: query.sorting ?? 'sortId DESC',
    }),
  });
}

/** 登录即可。keyword 模糊匹配，触底翻页不要一次拉全量 */
export function getCarrierPagedList(query: LookupPageQuery = {}) {
  return request<PagedResult<CarrierListItem>>({
    url: '/services/app/CarrierAdmin/GetPagedListAsync',
    params: pageParams(query),
  });
}

export function getCodeGoodsPagedList(query: LookupPageQuery = {}) {
  return request<PagedResult<CodeGoodsListItem>>({
    url: '/services/app/CodeGoodsAdmin/GetPagedListAsync',
    params: pageParams(query),
  });
}
