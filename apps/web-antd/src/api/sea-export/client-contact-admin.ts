import { requestClient } from '#/api/request';

export namespace ClientContactAdminApi {
  /** ID DTO */
  export interface IdDto {
    id: number;
    /** 批量删除用这个 */
    ids?: number[];
  }

  /** 新增联系人参数 */
  export interface ClientContactAddDto {
    /** 合作客户id */
    clientId: string;
    /** 名字 */
    name?: string;
    /** 手机 */
    mobile?: string;
    /** 邮箱 */
    email?: string;
    /** 办公电话 */
    tel?: string;
    /** 职位 */
    position?: string;
    /** 微信号 */
    weChat?: string;
    /** 是否默认 */
    isDefault?: boolean;
    /** 备注 */
    remark?: string;
    /** qq */
    qq?: string;
    /** 发票可用 */
    invoiceEnable?: boolean;
    /** 对账可用 */
    statementEnable?: boolean;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: number;
  }

  /** 编辑联系人参数 */
  export interface ClientContactEditDto {
    id?: number;
    /** 合作客户id */
    clientId: string;
    /** 名字 */
    name?: string;
    /** 手机 */
    mobile?: string;
    /** 邮箱 */
    email?: string;
    /** 办公电话 */
    tel?: string;
    /** 职位 */
    position?: string;
    /** 微信号 */
    weChat?: string;
    /** 是否默认 */
    isDefault?: boolean;
    /** 备注 */
    remark?: string;
    /** qq */
    qq?: string;
    /** 发票可用 */
    invoiceEnable?: boolean;
    /** 对账可用 */
    statementEnable?: boolean;
  }

  /** 联系人详情/列表输出 */
  export interface ClientContactDto {
    /** 合作客户id */
    clientId: string;
    /** 名字 */
    name?: string;
    /** 手机 */
    mobile?: string;
    /** 邮箱 */
    email?: string;
    /** 办公电话 */
    tel?: string;
    /** 职位 */
    position?: string;
    /** 微信号 */
    weChat?: string;
    /** 是否默认 */
    isDefault: boolean;
    /** 备注 */
    remark?: string;
    /** qq */
    qq?: string;
    /** 发票可用 */
    invoiceEnable: boolean;
    /** 对账可用 */
    statementEnable: boolean;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 分页列表响应 */
  export interface PagedListOfClientContactDto {
    /** 跳过的数量 */
    skipCount: number;
    /** 返回的最大数据量 */
    maxResultCount: number;
    /** 分好页的数据集合 */
    items?: ClientContactDto[];
    /** 总记录数 */
    totalCount: number;
    /** 当前页 */
    currentPage: number;
    /** 总页数 */
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 合作客户id */
    ClientId?: string;
    /** 是否默认 */
    IsDefault?: boolean;
    /** qq */
    QQ?: string;
    /** 发票可用 */
    InvoiceEnable?: boolean;
    /** 对账可用 */
    StatementEnable?: boolean;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/ClientContactAdmin';

/**
 * 新增联系人
 */
export const addClientContact = (
  data: ClientContactAdminApi.ClientContactAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 删除联系人
 */
export const deleteClientContact = (data: ClientContactAdminApi.IdDto) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data,
  });
};

/**
 * 编辑联系人
 */
export const editClientContact = (
  data: ClientContactAdminApi.ClientContactEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 获取联系人分页列表
 */
export const getClientContactPagedList = (
  params: ClientContactAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ClientContactAdminApi.PagedListOfClientContactDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取联系人详情
 */
export const getClientContactDetail = (id: number) => {
  return requestClient.get<ClientContactAdminApi.ClientContactDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};
