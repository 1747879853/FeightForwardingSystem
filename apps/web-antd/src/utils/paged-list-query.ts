import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { message } from 'ant-design-vue';

import { getSortSessionList, setSortSessionList } from '#/store/sort-session';

export type SortOrder = 'asc' | 'desc';

export type SortItem = {
  field: string;
  order: SortOrder;
};

export type PagedListQueryOptions = {
  /** 未点击列头且无会话排序时使用 */
  defaultSort?: string;
  /** field -> 后端 Sorting 字段名 */
  fieldMap?: Record<string, string>;
  /** 表单值转换，如时间范围拆分 */
  mapParams?: (formValues: Record<string, any>) => Record<string, any>;
  /** 列表结果后处理 */
  afterFetch?: <T>(result: T) => Promise<T> | T;
};

export type PagedListQueryFn = ((
  params: {
    page: { currentPage: number; pageSize: number };
    sort?: Record<string, any>;
  },
  formValues: Record<string, any>,
) => Promise<any>) & {
  __pagedSortOptions?: PagedListQueryOptions;
  __isPagedListQuery?: true;
};

type SortContext = {
  columns: NonNullable<VxeTableGridOptions['columns']>;
  defaultSort?: string;
  fieldMap?: Record<string, string>;
  listKey: string;
};

const NON_SORTABLE_TYPES = new Set(['checkbox', 'expand', 'radio', 'seq']);
const NON_SORTABLE_FIELDS = new Set(['actions', 'operation']);

let activeSortContext: null | SortContext = null;

export function runWithSortContext<T>(
  context: SortContext,
  fn: () => T | Promise<T>,
): Promise<T> | T {
  activeSortContext = context;
  try {
    return fn();
  } finally {
    activeSortContext = null;
  }
}

export function getActiveSortContext() {
  return activeSortContext;
}

export function isPagedListQuery(fn: unknown): fn is PagedListQueryFn {
  return (
    typeof fn === 'function' &&
    (fn as PagedListQueryFn).__isPagedListQuery === true
  );
}

export function camelToPascal(field: string): string {
  if (!field) {
    return field;
  }
  return field
    .split('.')
    .map((part) => {
      if (!part) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('.');
}

export function parseAbpSorting(sorting?: string): SortItem[] {
  if (!sorting?.trim()) {
    return [];
  }
  return sorting
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const parts = segment.split(/\s+/);
      const field = parts[0] ?? '';
      const orderToken = (parts[1] ?? 'ASC').toUpperCase();
      const order: SortOrder = orderToken === 'DESC' ? 'desc' : 'asc';
      return {
        field: pascalToCamel(field),
        order,
      };
    })
    .filter((item) => item.field);
}

function pascalToCamel(field: string): string {
  if (!field) {
    return field;
  }
  return field
    .split('.')
    .map((part) => {
      if (!part) {
        return part;
      }
      return part.charAt(0).toLowerCase() + part.slice(1);
    })
    .join('.');
}

export function isSortableColumn(column: Record<string, any>): boolean {
  if (!column || column.sortable === false) {
    return false;
  }
  if (column.type && NON_SORTABLE_TYPES.has(String(column.type))) {
    return false;
  }
  const field = column.field;
  if (!field || NON_SORTABLE_FIELDS.has(String(field))) {
    return false;
  }
  return true;
}

export function applyDefaultSortable(
  columns: any[] | undefined,
): any[] | undefined {
  if (!Array.isArray(columns)) {
    return columns;
  }
  return columns.map((column) => {
    const nextColumn = { ...column };
    if (Array.isArray(column.children) && column.children.length > 0) {
      nextColumn.children = applyDefaultSortable(column.children);
      return nextColumn;
    }
    if (isSortableColumn(column)) {
      nextColumn.sortable = true;
    }
    return nextColumn;
  });
}

function findColumnByField(
  columns: NonNullable<VxeTableGridOptions['columns']> | undefined,
  field: string,
): Record<string, any> | undefined {
  if (!Array.isArray(columns)) {
    return undefined;
  }
  for (const column of columns) {
    if (!column) {
      continue;
    }
    if (Array.isArray(column.children) && column.children.length > 0) {
      const hit = findColumnByField(column.children, field);
      if (hit) {
        return hit;
      }
      continue;
    }
    if (column.field === field) {
      return column as Record<string, any>;
    }
  }
  return undefined;
}

export function resolveSortingField(
  field: string,
  columns: NonNullable<VxeTableGridOptions['columns']> | undefined,
  fieldMap?: Record<string, string>,
): string {
  if (fieldMap?.[field]) {
    return fieldMap[field];
  }
  const column = findColumnByField(columns, field);
  if (column?.sortField) {
    return String(column.sortField);
  }
  return camelToPascal(field);
}

export function buildAbpSorting(
  sortList: SortItem[],
  columns: NonNullable<VxeTableGridOptions['columns']> | undefined,
  fieldMap?: Record<string, string>,
): string | undefined {
  if (!sortList.length) {
    return undefined;
  }
  const segments = sortList.map((item) => {
    const field = resolveSortingField(item.field, columns, fieldMap);
    const direction = item.order === 'desc' ? 'DESC' : 'ASC';
    return `${field} ${direction}`;
  });
  return segments.join(', ');
}

export function toggleSortList(current: SortItem[], field: string): SortItem[] {
  const index = current.findIndex((item) => item.field === field);
  if (index === -1) {
    return [...current, { field, order: 'asc' }];
  }
  const currentItem = current[index];
  if (!currentItem) {
    return current;
  }
  if (currentItem.order === 'asc') {
    const next = [...current];
    next[index] = { field, order: 'desc' };
    return next;
  }
  return current.filter((_, itemIndex) => itemIndex !== index);
}

function normalizeVxeSortOrder(order: unknown): SortOrder | null {
  if (order === 'asc' || order === 'desc') {
    return order;
  }
  if (order === 'ASC') {
    return 'asc';
  }
  if (order === 'DESC') {
    return 'desc';
  }
  return null;
}

export function parseVxeProxySorts(params: Record<string, any>): SortItem[] {
  const sorts = params?.sorts ?? params?.sortList;
  if (Array.isArray(sorts) && sorts.length > 0) {
    return sorts
      .map((item) => {
        const field = item?.field ?? item?.property;
        const order = normalizeVxeSortOrder(item?.order);
        if (!field || !order) {
          return null;
        }
        return { field: String(field), order };
      })
      .filter((item): item is SortItem => item !== null);
  }
  const sort = params?.sort;
  const field = sort?.field ?? sort?.property;
  const order = normalizeVxeSortOrder(sort?.order);
  if (field && order) {
    return [{ field: String(field), order }];
  }
  return [];
}

function isSameSortList(a: SortItem[], b: SortItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((item, index) => {
    const other = b[index];
    return other && item.field === other.field && item.order === other.order;
  });
}

function findClickedSortField(
  sessionList: SortItem[],
  proxySortList: SortItem[],
): string | undefined {
  for (const item of proxySortList) {
    if (!sessionList.some((sessionItem) => sessionItem.field === item.field)) {
      return item.field;
    }
  }
  for (const item of proxySortList) {
    const sessionItem = sessionList.find(
      (session) => session.field === item.field,
    );
    if (sessionItem && sessionItem.order !== item.order) {
      return item.field;
    }
  }
  for (const item of sessionList) {
    if (!proxySortList.some((proxyItem) => proxyItem.field === item.field)) {
      return item.field;
    }
  }
  if (proxySortList.length === 1) {
    return proxySortList[0]?.field;
  }
  return proxySortList[proxySortList.length - 1]?.field;
}

/**
 * vxe 在 sort-change 之前就 commitProxy，排序状态须在 query 内解析 params.sorts。
 */
export function resolveEffectiveSortList(
  listKey: string,
  params: Record<string, any>,
  defaultSort?: string,
): SortItem[] {
  const sessionList = listKey ? getSortSessionList(listKey) : [];
  const proxySortList = parseVxeProxySorts(params);
  const defaultList = parseAbpSorting(defaultSort);

  if (proxySortList.length > 0) {
    if (
      sessionList.length === 0 &&
      defaultList.length > 0 &&
      isSameSortList(proxySortList, defaultList)
    ) {
      return defaultList;
    }

    if (sessionList.length > 0 && isSameSortList(proxySortList, sessionList)) {
      return sessionList;
    }

    const clickedField = findClickedSortField(sessionList, proxySortList);
    if (clickedField) {
      const nextSessionList = toggleSortList(sessionList, clickedField);
      if (listKey) {
        setSortSessionList(listKey, nextSessionList);
      }
      if (nextSessionList.length > 0) {
        return nextSessionList;
      }
      return defaultList;
    }

    if (sessionList.length === 0) {
      if (listKey) {
        setSortSessionList(listKey, proxySortList);
      }
      return proxySortList;
    }
  }

  if (sessionList.length > 0) {
    return sessionList;
  }
  return defaultList;
}

export function getEffectiveSortList(
  listKey: string,
  defaultSort?: string,
): SortItem[] {
  const sessionList = getSortSessionList(listKey);
  if (sessionList.length > 0) {
    return sessionList;
  }
  return parseAbpSorting(defaultSort);
}

export function toVxeDefaultSort(
  sortList: SortItem[],
): VxeTableGridOptions['sortConfig'] extends { defaultSort?: infer T }
  ? T | undefined
  : undefined {
  if (!sortList.length) {
    return undefined;
  }
  if (sortList.length === 1) {
    const [onlyItem] = sortList;
    if (!onlyItem) {
      return undefined;
    }
    return {
      field: onlyItem.field,
      order: onlyItem.order,
    } as any;
  }
  return sortList.map((item) => ({
    field: item.field,
    order: item.order,
  })) as any;
}

export function isRemoteSortEnabled(
  gridOptions?: VxeTableGridOptions,
): boolean {
  if (!gridOptions?.proxyConfig?.ajax?.query) {
    return false;
  }
  if (gridOptions.pagerConfig?.enabled === false) {
    return false;
  }
  return true;
}

export function syncGridSortFromSession(
  grid: Record<string, any> | undefined,
  sortList: SortItem[],
) {
  if (!grid?.clearSort || !grid?.sort) {
    return;
  }
  grid.clearSort();
  sortList.forEach((item) => {
    grid.sort({ field: item.field, order: item.order });
  });
}

export function createPagedListQuery<
  TParams extends Record<string, any>,
  TResult,
>(
  apiFn: (params: TParams) => Promise<TResult>,
  options: PagedListQueryOptions = {},
): PagedListQueryFn {
  const queryFn = (async (
    params: {
      page: { currentPage: number; pageSize: number };
      sort?: Record<string, any>;
    },
    formValues: Record<string, any>,
  ) => {
    const context = getActiveSortContext();
    const listKey = context?.listKey ?? '';
    const columns = context?.columns ?? [];
    const fieldMap = options.fieldMap ?? context?.fieldMap;
    const defaultSort = options.defaultSort ?? context?.defaultSort;

    const effectiveSortList = resolveEffectiveSortList(
      listKey,
      params,
      defaultSort,
    );
    let sorting =
      buildAbpSorting(effectiveSortList, columns, fieldMap) ??
      (effectiveSortList.length === 0 ? defaultSort : undefined);

    const mappedFormValues = options.mapParams
      ? options.mapParams(formValues)
      : formValues;

    const requestParams = {
      pageIndex: params.page.currentPage,
      pageSize: params.page.pageSize,
      sorting,
      ...mappedFormValues,
    } as unknown as TParams;

    try {
      const result = await apiFn(requestParams);
      return options.afterFetch ? await options.afterFetch(result) : result;
    } catch (error) {
      if (
        sorting &&
        defaultSort &&
        sorting.toLowerCase() !== defaultSort.toLowerCase()
      ) {
        message.error('该列不支持排序');
        if (listKey) {
          setSortSessionList(listKey, parseAbpSorting(defaultSort));
        }
        const fallbackParams = {
          ...requestParams,
          sorting: defaultSort,
        } as TParams;
        const result = await apiFn(fallbackParams);
        return options.afterFetch ? await options.afterFetch(result) : result;
      }
      throw error;
    }
  }) as PagedListQueryFn;

  queryFn.__isPagedListQuery = true;
  queryFn.__pagedSortOptions = options;
  return queryFn;
}
