import { requestClient } from '#/api/request';

/**
 * 快捷文本业务类型枚举
 */
export enum QuickTextBizType {
  /** 海运出口 */
  SeaExport = 0,
  /** 海运进口 */
  SeaImport = 1,
  /** 空运出口 */
  AirExport = 2,
}

export namespace QuickTextAdminApi {
  /** 新增快捷文本参数 */
  export interface AddQuickTextInputDto {
    /** 业务类型。0海运出口 1海运进口 2空运出口 */
    bizType: QuickTextBizType;
    /** 是否设为默认 */
    default?: boolean;
    /** 标题，最长 32 字符 */
    title?: string | null;
    /** 快捷文本正文，最长 4096 字符 */
    text: string;
    /** 备注，最长 4096 字符 */
    remark?: string | null;
    /** 排序值，降序，大的在前 */
    sortId?: number;
  }

  /** 编辑快捷文本参数 */
  export interface EditQuickTextInputDto {
    /** 主键 id */
    id: string;
    /** 是否默认 */
    default: boolean;
    /** 标题，最长 32 字符 */
    title?: string | null;
    /** 正文，最长 4096 字符 */
    text: string;
    /** 备注，最长 4096 字符 */
    remark?: string | null;
    /** 排序值，降序 */
    sortId: number;
  }

  /** 删除快捷文本参数 */
  export interface DeleteQuickTextInputDto {
    /** 单条删除时传 */
    id?: string | null;
    /** 批量删除时传。只要传了非空的 ids，就忽略 id */
    ids?: string[] | null;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 页码，从 1 开始 */
    pageIndex?: number;
    /** 每页条数，范围 1~100000 */
    pageSize?: number;
    /** 关键字，模糊匹配标题、正文、备注三列 */
    keyword?: string | null;
    /** 业务类型筛选。不传则返回全部业务类型 */
    bizType?: QuickTextBizType | null;
    /** 是否默认筛选。不传则不筛选 */
    default?: boolean | null;
  }

  /** 快捷文本详情 DTO */
  export interface QuickTextDto {
    /** 主键 id */
    id: string;
    /** 业务类型。0海运出口 1海运进口 2空运出口 */
    bizType: QuickTextBizType;
    /** 是否默认 */
    default: boolean;
    /** 标题，可能为 null */
    title: string | null;
    /** 快捷文本正文 */
    text: string;
    /** 备注，可能为 null */
    remark: string | null;
    /** 排序值 */
    sortId: number;
    /** 创建时间 */
    creationTime: string;
    /** 创建人 id */
    creatorUserId: number | null;
    /** 创建人昵称 */
    creatorUserName: string;
    /** 最后修改时间，从未修改过为 null */
    lastModificationTime: string | null;
    /** 最后修改人 id */
    lastModifierUserId: number | null;
    /** 最后修改人昵称，从未修改过为 null */
    lastModifierUserName: string | null;
  }

  /** 分页列表响应 */
  export interface PagedResultOfQuickTextDto {
    /** 当前页数据 */
    items: QuickTextDto[];
    /** 总记录数 */
    totalCount: number;
    /** 已跳过条数 */
    skipCount: number;
    /** 每页条数 */
    maxResultCount: number;
    /** 当前页码 */
    currentPage: number;
    /** 总页数 */
    totalPages: number;
  }
}

const ADMIN_API_PREFIX = '/services/app/QuickTextAdmin';

/**
 * 新增快捷文本
 * @param data 新增参数
 * @returns 新增成功后的主键 id (Guid)
 */
export const addQuickText = (data: QuickTextAdminApi.AddQuickTextInputDto) => {
  return requestClient.post<string>(`${ADMIN_API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑快捷文本
 * @param data 编辑参数
 * @returns 固定为 true，失败会走 error
 */
export const editQuickText = (
  data: QuickTextAdminApi.EditQuickTextInputDto,
) => {
  return requestClient.put<boolean>(`${ADMIN_API_PREFIX}/EditAsync`, data);
};

/**
 * 删除快捷文本（支持单条和批量删除）
 * @param data 删除参数，id 和 ids 二选一
 * @returns 固定为 true，失败会走 error
 */
export const deleteQuickText = (
  data: QuickTextAdminApi.DeleteQuickTextInputDto,
) => {
  return requestClient.delete<boolean>(`${ADMIN_API_PREFIX}/DeleteAsync`, {
    data,
  });
};

/**
 * 获取快捷文本分页列表（管理页）
 * @param params 查询参数
 * @returns 分页结果
 */
export const getQuickTextPagedList = (
  params: QuickTextAdminApi.GetPagedListParams,
) => {
  return requestClient.get<QuickTextAdminApi.PagedResultOfQuickTextDto>(
    `${ADMIN_API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取快捷文本详情
 * @param id 主键 id
 * @returns 快捷文本详情
 */
export const getQuickTextDetail = (id: string) => {
  return requestClient.get<QuickTextAdminApi.QuickTextDto>(
    `${ADMIN_API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};
