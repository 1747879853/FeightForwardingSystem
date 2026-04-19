import { requestClient } from '#/api/request';

export namespace ClientAdminApi {
  /** 客户性质枚举 */
  export enum ClientType {
    /** 直客 */
    DirectCustomer = 0,
    /** 同行 */
    Peer = 1,
    /** 供应商 */
    Supplier = 2,
  }

  /** 合作状态枚举 */
  export enum CoopStatus {
    /** 潜在 */
    Potential = 0,
    /** 正式 */
    Formal = 1,
    /** 暂停合作 */
    Suspended = 2,
    /** 黑名单 */
    Blacklist = 3,
  }

  /** 货物类型枚举 */
  export enum CargoType {
    S = 0,
    R = 1,
    D = 2,
    O = 3,
  }

  /** 用户属性枚举 */
  export enum UserAttribute {
    None = 0,
    Operation = 1,
    CustomerService = 2,
    Documentation = 4,
    Business = 8,
    Sale = 16,
    Finance = 32,
    OverseasCustomerService = 64,
    HR = 128,
  }

  /** 客户名称校验参数 */
  export interface ClientNameCheckDto {
    /** 当前id 如果是新建 输入空 */
    id?: string;
    /** 客户全称 */
    fullName?: string;
  }

  /** Guid类型的Id Dto */
  export interface GuidIdDto {
    id?: string;
    /** 批量删除用这个 */
    ids?: string[];
  }

  /** 附件项输入DTO */
  export interface AttachmentItemForItemInputDto {
    /** 附件id */
    attachmentId?: number;
    /** 顺序 */
    displayOrder?: number;
    /** 附件关联Id */
    itemId?: string;
    /** 文件下载Url */
    url?: string;
    id?: number;
  }

  /** 干系人新增DTO */
  export interface ClientStakeholderAddDto {
    /** 干系人 */
    userId: number;
    /** 是否默认 */
    isDefault: boolean;

    userAttribute: number;
  }

  /** 地址新增DTO */
  export interface ClientAddressAddDto {
    /** 名字 例如 **分公司 */
    name: string;
    /** 是否默认 */
    isDefault?: boolean;
    /** 地址 */
    address?: string;
    /** 联系人 */
    contactPerson?: string;
    /** 手机 */
    mobile?: string;
    /** 办公电话 */
    tel?: string;
    /** 备注 */
    remark?: string;
  }

  /** 新增客户参数 */
  export interface ClientAddDto {
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 国家 */
    countryId?: number;
    /** 所在省市 */
    areaId?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable?: boolean;
    /** 客户性质 0-直客 1-同行 2-供应商 */
    clientType?: ClientType;
    /** 行业类别 */
    industryCategories?: string;
    /** 备注 */
    remark?: string;
    /** 客户英文全称 */
    enFullName?: string;
    /** 纳税人识别号 */
    taxNo?: string;
    /** 邮箱 */
    email?: string;
    /** 网址 */
    url?: string;
    /** 法人 */
    legalPerson?: string;
    /** 注册资本(万) */
    registeredCapital?: string;
    /** 成立日期 */
    establishmentDate?: string;
    /** 营业期限 */
    businessTerm?: string;
    /** 是否客户 */
    isClient?: boolean;
    /** 客户合作状态 */
    clientCoopStatus?: CoopStatus;
    /** 客户等级 前端自定义枚举 */
    clientLevel?: number;
    /** 客户来源 前端自定义枚举 */
    source?: number;
    /** 货物类型 */
    cargoType?: CargoType;
    /** 客户结算币种id */
    clientCurrencyId?: number;
    /** 客户首次合作时间 */
    clientCoopSince?: string;
    /** 客户最近交易时间 */
    clientLastTxnTime?: string;
    /** 是否供应商 */
    isSupplier?: boolean;
    /** 供应商合作状态 */
    supplierCoopStatus?: CoopStatus;
    /** 供应商等级 前端自定义枚举 */
    supplierLevel?: number;
    /** 供应商结算币种id */
    supplierCurrencyId?: number;
    /** 优质航线Ids */
    laneIds?: number[];
    /** 供应商首次合作时间 */
    supplierCoopSince?: string;
    /** 供应商最近交易时间 */
    supplierLastTxnTime?: string;
    /** 多个附件 */
    attachments?: AttachmentItemForItemInputDto[];
    /** 干系人列表 */
    sales?: ClientStakeholderAddDto[];
    /** 干系人列表 */
    customerServices?: ClientStakeholderAddDto[];
    /** 干系人列表 */
    operations?: ClientStakeholderAddDto[];
    /** 干系人列表 */
    documentations?: ClientStakeholderAddDto[];
    /** 地址列表 */
    addresses?: ClientAddressAddDto[];
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: string;
  }

  /** 干系人编辑DTO */
  export interface ClientStakeholderEditDto {
    id: number;
    /** 合作客户id */
    clientId: string;
    /** 干系人 */
    userId: number;
    /** 是否默认 */
    isDefault: boolean;
    userAttribute: number;
  }

  /** 地址编辑DTO */
  export interface ClientAddressEditDto {
    id?: number;
    /** 合作客户id */
    name: string;
    /** 是否默认 */
    isDefault?: boolean;
    /** 地址 */
    address?: string;
    /** 联系人 */
    contactPerson?: string;
    /** 手机 */
    mobile?: string;
    /** 办公电话 */
    tel?: string;
    /** 备注 */
    remark?: string;
  }

  /** 编辑客户参数 */
  export interface ClientEditDto {
    id: string;
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 国家 */
    countryId?: number;
    /** 所在省市 */
    areaId?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable?: boolean;
    /** 客户性质 0-直客 1-同行 2-供应商 */
    clientType?: ClientType;
    /** 行业类别 */
    industryCategories?: string;
    /** 备注 */
    remark?: string;
    /** 客户英文全称 */
    enFullName?: string;
    /** 纳税人识别号 */
    taxNo?: string;
    /** 邮箱 */
    email?: string;
    /** 网址 */
    url?: string;
    /** 法人 */
    legalPerson?: string;
    /** 注册资本(万) */
    registeredCapital?: string;
    /** 成立日期 */
    establishmentDate?: string;
    /** 营业期限 */
    businessTerm?: string;
    /** 是否客户 */
    isClient?: boolean;
    /** 客户合作状态 */
    clientCoopStatus?: CoopStatus;
    /** 客户等级 前端自定义枚举 */
    clientLevel?: number;
    /** 客户来源 前端自定义枚举 */
    source?: number;
    /** 货物类型 */
    cargoType?: CargoType;
    /** 客户结算币种id */
    clientCurrencyId?: number;
    /** 客户首次合作时间 */
    clientCoopSince?: string;
    /** 客户最近交易时间 */
    clientLastTxnTime?: string;
    /** 是否供应商 */
    isSupplier?: boolean;
    /** 供应商合作状态 */
    supplierCoopStatus?: CoopStatus;
    /** 供应商等级 前端自定义枚举 */
    supplierLevel?: number;
    /** 供应商结算币种id */
    supplierCurrencyId?: number;
    /** 优质航线Ids */
    laneIds?: number[];
    /** 供应商首次合作时间 */
    supplierCoopSince?: string;
    /** 供应商最近交易时间 */
    supplierLastTxnTime?: string;
    /** 干系人列表 */
    sales?: ClientStakeholderEditDto[];
    /** 干系人列表 */
    customerServices?: ClientStakeholderEditDto[];
    /** 干系人列表 */
    operations?: ClientStakeholderEditDto[];
    /** 干系人列表 */
    documentations?: ClientStakeholderEditDto[];
    /** 地址列表 */
    addresses?: ClientAddressEditDto[];
  }

  /** 简易币种DTO */
  export interface CurrencySimpleDto {
    /** 币别代码 */
    code?: string;
    /** 中文名称 */
    cnName?: string;
    /** 英文名称 */
    enName?: string;
    /** 默认对人民币汇率 */
    defaultRate: number;
  }

  /** 客户航线DTO */
  export interface ClientLaneDto {
    /** 航线id */
    id: number;
    /** 航线中文名称 */
    laneName?: string;
  }

  /** 干系人DTO */
  export interface ClientStakeholderDto {
    /** 合作客户id */
    clientId: string;
    /** 干系人 */
    userId: number;
    /** 是否默认 */
    isDefault: boolean;
    /** 干系人昵称 */
    userNickName?: string;
    /** 用户属性 */
    userAttribute?: UserAttribute;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  export interface ClientStakeholderListDto {
    /** 用户属性 */
    userAttribute?: number;
    /** 干系人DTO */
    stakeholderList?: ClientStakeholderDto[];
    /** 干系人 */
    userIds?: number[];
  }

  /** 地址DTO */
  export interface ClientAddressDto {
    /** 合作客户id */
    clientId: string;
    /** 名字 例如 **分公司 */
    name?: string;
    /** 是否默认 */
    isDefault: boolean;
    /** 地址 */
    address?: string;
    /** 联系人 */
    contactPerson?: string;
    /** 手机 */
    mobile?: string;
    /** 办公电话 */
    tel?: string;
    /** 备注 */
    remark?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 国家代码DTO */
  export interface CountryCodeDto {
    /** 国家唯一代码 */
    code?: string;
    /** 国家名称 */
    countryName?: string;
    /** 国家英文名称 */
    countryEnName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 首都 */
    capital?: string;
    /** 关税等级 */
    tariff: number;
    /** 吨位税 */
    tonnageTax: number;
    /** 国家3字代码 */
    countryCode3?: string;
    /** 国家描述 */
    explain?: string;
    /** 备注 */
    remark?: string;
    /** 状态 0启用 1禁用 */
    status: number;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 附件项DTO */
  export interface AttachmentItemDto {
    /** 附件Id */
    attachmentId?: number;
    /** 附件关联Id */
    itemId?: string;
    /** 附件关联的模块Id */
    moduleTypeId?: string;
    /** 是否优先展示 */
    isFirstShow?: boolean;
    /** 顺序 */
    displayOrder?: number;
    /** 文件下载Url，通过计算获得 */
    url?: string;
    mediaType?: number;
    /** 文件显示名称 */
    friendlyFileName?: string;

    fileLength: number;
    creationTime: string;
    creatorUserNickName: string;
    id: number;
  }

  /** 客户详情/列表输出 */
  export interface ClientDto {
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 国家 */
    countryId?: number;
    /** 所在省市 */
    areaId?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable: boolean;
    /** 客户性质 0-直客 1-同行 2-供应商 */
    clientType: ClientType;
    /** 行业类别 */
    industryCategories?: string;
    /** 备注 */
    remark?: string;
    /** 客户英文全称 */
    enFullName?: string;
    /** 纳税人识别号 */
    taxNo?: string;
    /** 邮箱 */
    email?: string;
    /** 网址 */
    url?: string;
    /** 法人 */
    legalPerson?: string;
    /** 注册资本(万) */
    registeredCapital?: string;
    /** 成立日期 */
    establishmentDate?: string;
    /** 营业期限 */
    businessTerm?: string;
    /** 是否客户 */
    isClient: boolean;
    /** 客户合作状态 */
    clientCoopStatus: CoopStatus;
    /** 客户等级 前端自定义枚举 */
    clientLevel?: number;
    /** 客户来源 前端自定义枚举 */
    source?: number;
    /** 货物类型 */
    cargoType: CargoType;
    /** 客户结算币种id */
    clientCurrencyId?: number;
    /** 客户结算币种 */
    clientCurrency?: CurrencySimpleDto;
    /** 客户信用额度 不可修改 */
    clientAllowAmount?: number;
    /** 客户首次合作时间 */
    clientCoopSince?: string;
    /** 客户最近交易时间 */
    clientLastTxnTime?: string;
    /** 是否供应商 */
    isSupplier: boolean;
    /** 供应商合作状态 */
    supplierCoopStatus: CoopStatus;
    /** 供应商等级 前端自定义枚举 */
    supplierLevel?: number;
    /** 供应商结算币种id */
    supplierCurrencyId?: number;
    /** 供应商结算币种 */
    supplierCurrency?: CurrencySimpleDto;
    /** 年TEU 不可修改 */
    yearTeu?: number;
    /** 年票数 不可修改 */
    yearTicketCount?: number;
    /** 优质航线 列表没有 详情有 */
    clientLaneCodes?: ClientLaneDto[];
    /** 供应商信用额度 不可修改 */
    supplierAllowAmount?: number;
    /** 供应商首次合作时间 */
    supplierCoopSince?: string;
    /** 供应商最近交易时间 */
    supplierLastTxnTime?: string;
    /** 多个附件 详情有 列表没有 */
    attachments?: AttachmentItemDto[];

    /** 干系人列表 */
    sales?: ClientStakeholderDto[];
    /** 干系人列表 */
    customerServices?: ClientStakeholderDto[];
    /** 干系人列表 */
    operations?: ClientStakeholderDto[];
    /** 干系人列表 */
    documentations?: ClientStakeholderDto[];
    /** 地址列表 详情有 列表没有 */
    addresses?: ClientAddressDto[];
    /** 国家 */
    country?: CountryCodeDto;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfClientDto {
    /** 跳过的数量 */
    skipCount: number;
    /** 返回的最大数据量 */
    maxResultCount: number;
    /** 分好页的数据集合 */
    items?: ClientDto[];
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
    /** 行业类别 */
    IndustryCategory?: string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 编辑客户附件输入 */
  export interface ClientEditAttachmentDto {
    id: string;
    /** 多个附件 */
    attachments?: AttachmentItemForItemInputDto[];
  }
}

const API_PREFIX = '/services/app/ClientAdmin';

/**
 * 客户全称校验
 */
export const clientNameCheck = (data: ClientAdminApi.ClientNameCheckDto) => {
  return requestClient.post<void>(`${API_PREFIX}/ClientNameChecksync`, data);
};

/**
 * 获取客户分页列表
 */
export const getClientPagedList = (
  params: ClientAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ClientAdminApi.PagedListOfClientDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取客户详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getClientDetail = (id: string) => {
  return requestClient.get<ClientAdminApi.ClientDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增客户
 */
export const addClient = (data: ClientAdminApi.ClientAddDto) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑客户
 */
export const editClient = (data: ClientAdminApi.ClientEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除客户
 */
export const deleteClient = (data: ClientAdminApi.GuidIdDto) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data,
  });
};

/**
 * 编辑客户附件
 */
export const editClientAttachment = (
  data: ClientAdminApi.ClientEditAttachmentDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAttachmentAsync`, data);
};

/**
 * 获取当前登录客户的订单列表
 */
export const getMyOrders = () => {
  return requestClient.get<string[]>(`${API_PREFIX}/GetMyOrders`);
};

export const EditAttachmentAsync = (
  data: ClientAdminApi.ClientEditAttachmentDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAttachmentAsync`, data);
};
