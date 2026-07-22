import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/ClientBillingPeriodAdmin';

export namespace BillingPeriodAdminApi {
  /** 附件项输入DTO */
  export interface AttachmentItemForItemInputDto {
    /** 附件id */
    attachmentId?: number;
    /** 附件详细类型id（托书/提单/发票等） */
    attachmentDtlTypeId?: number;
    /** 客户是否可见 */
    clientVisible?: boolean;
    /** 顺序 */
    displayOrder?: number;
    /** 文件下载Url */
    url?: string;
  }

  /** 附件项DTO */
  export interface AttachmentItemDto {
    /** 关联id */
    id?: number;
    /** 附件id */
    attachmentId?: number;
    /** 附件详细类型id */
    attachmentDtlTypeId?: number;
    /** 附件详细类型简易对象 */
    attachmentDtlType?: any;
    /** 客户是否可见 */
    clientVisible?: boolean;
    /** 顺序 */
    displayOrder?: number;
    /** 下载地址 */
    url?: string;
    /** 文件类型 */
    mediaType?: number;
    /** 显示文件名 */
    friendlyFileName?: string;
    /** 文件大小 */
    fileLength?: number;
    /** 上传时间 */
    creationTime?: string;
    /** 上传人id */
    creatorUserId?: number;
    /** 上传人昵称 */
    creatorUserName?: string;
  }

  /** 币别简易对象 */
  export interface CurrencySimpleDto {
    /** 币别代码 */
    code: string;
    /** 中文名 */
    cnName: string;
    /** 英文名 */
    enName: string;
    /** 默认对人民币汇率 */
    defaultRate: number;
  }

  /** 新增账单期参数 */
  export interface BillingPeriodAddDto {
    /** 客户id */
    clientId: number | string;
    /**长期有效  */
    permanent: boolean;
    /** 生效时间 */
    effectiveTime?: string;
    /** 失效时间 */
    expiringTime?: string;
    /** 业务类型 */
    bizTypes?: number[];
    /** 结算方式 */
    settlementType: number;
    /**间隔月份 */
    months?: number;
    /** 结算日 */
    settlementDay?: number;
    /** 天数 */
    days?: number;
    /** 备注 */
    remark?: string;
    /** 组织id */
    organizationUnitIds?: number[];
    /** 用户id */
    userIds?: number[];
    /**业务来源  */
    codeSourceIds?: number[];
    /** 附件列表 */
    attachments?: AttachmentItemForItemInputDto[];
    /** 合同号 */
    contractNo?: string;
    /** 日期类型 */
    dateType: number;
    /** 授信币别 id */
    creditCurrencyId?: number | null;
    /** 授信额度 */
    creditLimit?: number | null;
    /** 预警额度 */
    warningLimit?: number | null;
  }
  
  /** 修改账单期参数 */
  export interface BillingPeriodEditDto extends BillingPeriodAddDto {
    id: number | string;
  }

  /** 账单详情 */
  export interface BillingPeriodDetailDto {
    /** id */
    id: number | string;
    /** 客户id */
    clientId: number | string;
    /**长期有效  */
    permanent: boolean;
    /** 生效时间 */
    effectiveTime?: string;
    /** 失效时间 */
    expiringTime?: string;
    /** 业务类型 */
    bizTypes?: number[];
    /** 结算方式 */
    settlementType: number;
    /**间隔月份 */
    months?: number;
    /** 结算日 */
    settlementDay?: number;
    /** 天数 */
    days?: number;
    /** 备注 */
    remark?: string;
    /** 组织id */
    organizationUnitIds?: number[];
    /** 用户id */
    userIds?: number[];
    /**业务来源  */
    codeSourceIds?: number[];
    /** 附件列表 */
    attachments?: AttachmentItemDto[];
    /** 合同号 */
    contractNo?: string;
    /** 日期类型 */
    dateType: number;
    /** 授信币别 id */
    creditCurrencyId?: number | null;
    /** 授信币别简易对象 */
    creditCurrency?: CurrencySimpleDto;
    /** 授信额度 */
    creditLimit?: number | null;
    /** 预警额度 */
    warningLimit?: number | null;
  }

  export interface CbpUserDto {
    id: number;
    userNickName: string;
    userId: number;
  }

  export interface CbpOrgDto {
    id: number;
    organizationUnitId: number;
    organizationUnitName: string;
  }
  
  export interface ClientBillingPeriodDto {
    /** id */
    id: number | string;
    /** 客户id */
    clientId: number | string;
    /**长期有效  */
    permanent: boolean;
    /** 生效时间 */
    effectiveTime?: string;
    /** 失效时间 */
    expiringTime?: string;
    /** 业务类型 */
    bizTypes?: number[];
    /** 结算方式 */
    settlementType: number;
    /**间隔月份 */
    months?: number;
    /** 结算日 */
    settlementDay?: number;
    /** 天数 */
    days?: number;
    /** 备注 */
    remark?: string;
    /** 组织id */
    organizationUnitIds?: number[];
    /** 用户id */
    userIds?: number[];
    /**业务来源  */
    codeSourceIds?: number[];
    /** 附件列表 */
    attachments?: AttachmentItemDto[];
    /** 合同号 */
    contractNo?: string;
    /** 日期类型 */
    dateType: number;
    /** 授信币别 id */
    creditCurrencyId?: number | null;
    /** 授信币别简易对象 */
    creditCurrency?: CurrencySimpleDto;
    /** 授信额度 */
    creditLimit?: number | null;
    /** 预警额度 */
    warningLimit?: number | null;
    /** 组织机构 */
    cbpOrgs: CbpOrgDto[];

    cbpUsers: CbpUserDto[];
  }

  export interface ClientBillingPeriodForViewDto extends ClientBillingPeriodDto {
    organizationUnitName?: string;
    userName?: string;
    period?: string;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 客户id */
    ClientId?: number | string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 分页列表响应 */
  export interface PagedListOfBillingPeriodDto {
    skipCount?: number;
    maxResultCount?: number;
    items: ClientBillingPeriodDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }
  /** ID DTO */
  export interface IdDto {
    /** 大数 ID 经 json-bigint 解析为 string，需原样透传避免精度丢失 */
    id: number | string;
    /** 批量删除用这个 */
    ids?: (number | string)[];
  }
}
/** 不分页列表响应 */
// export interface ListOfBillingPeriodDto <BillingPeriodDetailDto[]>

/**
 * 新增账单期
 */
export const addBillingPeriod = (
  data: BillingPeriodAdminApi.BillingPeriodAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 修改账单期
 */
export const editBillingPeriod = (
  data: BillingPeriodAdminApi.BillingPeriodEditDto,
) => {
  return requestClient.put<number>(`${API_PREFIX}/EditAsync`, data);
};
/**
 * 删除账单期
 */
export const deleteBillingPeriod = (id: BillingPeriodAdminApi.IdDto) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: id,
  });
};

/**
 * 获取账单期分页列表
 */
export const getBillingPeriodPagedList = (
  params: BillingPeriodAdminApi.GetPagedListParams,
) => {
  return requestClient.get<BillingPeriodAdminApi.PagedListOfBillingPeriodDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取账单期不分页列表
 */
export const getBillingPeriodList = (
  params: BillingPeriodAdminApi.GetPagedListParams,
) => {
  return requestClient.get<BillingPeriodAdminApi.BillingPeriodDetailDto[]>(
    `${API_PREFIX}/GetListAsync`,
    { params },
  );
};

/**
 * 获取账单期详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getBillingPeriodDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<BillingPeriodAdminApi.BillingPeriodDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};