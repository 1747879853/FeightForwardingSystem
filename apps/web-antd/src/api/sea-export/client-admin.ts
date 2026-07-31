import { requestClient } from '#/api/request';

export namespace ClientAdminApi {
  /** 客户类型枚举 */
  export enum ClientType {
    /** 同行 */
    Peer = 0,
    /** 直客 */
    DirectCustomer = 1,
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
    /** 航线 */
    ShippingLine = 256,
  }

  /** 客户名称校验参数 */
  export interface ClientNameCheckDto {
    /** 当前id 如果是新建 输入空 */
    id?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户简称  */
    name?: string;
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
    /** 附件详细类型id（托书/提单/发票等） */
    attachmentDtlTypeId?: number;
    /** 客户是否可见 */
    clientVisible?: boolean;
    /** 顺序 */
    displayOrder?: number;
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
    /** 用户属性 */
    userAttribute: number;
  }

  /** 地址新增DTO */
  export interface ClientAddressAddDto {
    /** 名字 例如 **分公司 */
    name: string;
    /** 是否默认 */
    isDefault?: boolean;
    /** 地址类型 0-办公地址 1-发货地址 2-收货地址 3-其他地址 */
    addressType?: number;
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
    /** 手机号 */
    mobile?: string;
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
    /** 业务来源 */
    codeSourceId?: number;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable?: boolean;
    /** 客户类型 0-同行 1-直客 */
    clientType?: ClientType | null;
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
    /** 客户等级 前端自定义枚举 */
    clientLevel?: number;
    /** 客户来源 前端自定义枚举 */
    source?: number;
    /** 货物类型 */
    cargoType?: CargoType;
    /** 客户结算币种id */
    clientCurrencyId?: number;
    /** 是否供应商 */
    isSupplier?: boolean;
    /** 供应商等级 前端自定义枚举 */
    supplierLevel?: number;
    /** 供应商结算币种id */
    supplierCurrencyId?: number;
    /** 优质航线Ids */
    laneIds?: number[];
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
    /** 对账人用户ID列表 */
    reconcilerUserIds?: number[];
    /** 企业类型（前端自定义枚举） */
    enterpriseType?: number;
    /** 是否共享 */
    isShared?: boolean;
    /** 归属组织id（可选） */
    orgId?: null | number;
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
    clientId?: string;
    /** 名字 例如 **分公司 */
    name?: string;
    /** 地址类型 0-办公地址 1-发货地址 2-收货地址 3-其他地址 */
    addressType?: number;
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
    /** 手机号 */
    mobile?: string;
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
    /** 业务来源ID */
    codeSourceId?: number;
    /** 业务来源对象 */
    codeSource?: {
      id: number;
      cnName?: string;
      enName?: string;
      code?: string;
    };
    /** 是否有效 */
    enable?: boolean;
    /** 客户类型 0-同行 1-直客 */
    clientType?: ClientType | null;
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
    /** 客户等级 前端自定义枚举 */
    clientLevel?: number;
    /** 客户来源 前端自定义枚举 */
    source?: number;
    /** 货物类型 */
    cargoType?: CargoType;
    /** 客户结算币种id */
    clientCurrencyId?: number;
    /** 是否供应商 */
    isSupplier?: boolean;
    /** 供应商等级 前端自定义枚举 */
    supplierLevel?: number;
    /** 供应商结算币种id */
    supplierCurrencyId?: number;
    /** 优质航线Ids */
    laneIds?: number[];
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
    /** 对账人用户ID列表 */
    reconcilerUserIds?: number[];
    /** 企业类型（前端自定义枚举） */
    enterpriseType?: number;
    /** 是否共享 */
    isShared?: boolean;
    /** 归属组织id（可选） */
    orgId?: null | number;
  }

  /** 组织机构简易DTO（组织串 orgs 元素） */
  export interface OrganizationUnitSimpleDto {
    /** 组织id */
    id: number;
    /** 组织名 */
    name?: string;
    /** 本位币id，可空 */
    localCurrencyId?: null | number;
    /** 本位币编码，可空 */
    localCurrencyCode?: null | string;
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
    /** 用户属性 */
    userAttribute?: UserAttribute;
    /** 干系人昵称 */
    userNickName?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 对账人DTO */
  export interface ClientReconcilerDto {
    /** 主键ID */
    id: string;
    /** 所属客户ID */
    clientId: string;
    /** 对账人用户ID */
    userId: number;
    /** 对账人昵称 */
    userNickName?: string;
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
    /** 地址类型 0-办公地址 1-发货地址 2-收货地址 3-其他地址 */
    addressType?: number;
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

  /** 客户详情/列表输出 */
  export interface ClientDto {
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 手机号 */
    mobile?: string;
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
    /** 业务来源 */
    codeSourceId?: number;
    /** 是否有效 */
    enable: boolean;
    /** 客户类型 0-同行 1-直客 */
    clientType?: ClientType | null;

    enterpriseType?: number | null;
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

    /** 委托单位首次合作时间（只读计算字段） */
    clientCoopSince?: string;
    /** 委托单位最近交易时间（只读计算字段） */
    clientLastTxnTime?: string;
    /** 委托单位年TEU（只读计算字段，原yearTeu更名） */
    clientYearTeu?: number;
    /** 委托单位年票数（只读计算字段，原yearTicketCount更名） */
    clientYearTicketCount?: number;

    /** 是否供应商 */
    isSupplier: boolean;
    /** 供应商等级 前端自定义枚举 */
    supplierLevel?: number;
    /** 供应商结算币种id */
    supplierCurrencyId?: number;
    /** 供应商结算币种 */
    supplierCurrency?: CurrencySimpleDto;
    /** 供应商年TEU（只读计算字段，新增） */
    supplierYearTeu?: number;
    /** 供应商年票数（只读计算字段，新增） */
    supplierYearTicketCount?: number;
    /** 优质航线 列表没有 详情有 */
    clientLaneCodes?: ClientLaneDto[];
    /** 供应商信用额度 不可修改 */
    supplierAllowAmount?: number;
    /** 供应商首次合作时间（只读计算字段） */
    supplierCoopSince?: string;
    /** 供应商最近交易时间 Txn 是 Transaction 的标准缩写（只读计算字段） */
    supplierLastTxnTime?: string;
    /** 多个附件 详情有 列表没有 */
    attachments?: AttachmentItemDto[];
    /** 干系人列表 销售 */
    sales?: ClientStakeholderDto[];
    /** 干系人列表 客服 */
    customerServices?: ClientStakeholderDto[];
    /** 干系人列表 操作 */
    operations?: ClientStakeholderDto[];
    /** 干系人列表 单证 */
    documentations?: ClientStakeholderDto[];
    /** 地址列表 详情有 列表没有 */
    addresses?: ClientAddressDto[];
    /** 对账人列表 */
    reconcilers?: ClientReconcilerDto[];
    /** 国家 */
    country?: CountryCodeDto;

    /** 归属组织id（可空） */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织），可空 */
    orgs?: null | OrganizationUnitSimpleDto[];

    /** 是否失信 */
    isDishonest?: boolean;
    /** 失信备注（只读） */
    dishonestRemark?: string;

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
    /** 销售ID */
    SaleId?: number;
    /** 操作ID */
    OperationId?: number;
    /** 业务来源ID */
    CodeSourceId?: number;
    /** 优质航线IDs */
    LaneIds?: number[];
    /** 客户等级 */
    ClientLevel?: number;
    /** 地址（模糊匹配，含地址子表） */
    Address?: string;
    /** 客户简称（模糊匹配） */
    Name?: string;
    /** 客户全称（模糊匹配） */
    FullName?: string;
    /** 客户代码（模糊匹配） */
    Code?: string;
    /** 客户英文全称（模糊匹配） */
    EnFullName?: string;
    /** 是否失信 */
    IsDishonest?: boolean;
    /** 失信备注（模糊匹配） */
    DishonestRemark?: string;
    /** 企业类型 */
    EnterpriseType?: number;
    /** 是否共享 */
    IsShared?: boolean;

    /** 归属组织ID，为空不筛选 */
    OrgId?: number;

    /** 客户类型 0-同行 1-直客 */
    ClientType?: ClientType | null;

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

  /** 获取客户附件分组列表响应 */
  export interface ClientAttachmentGroupDto {
    attachmentDtlTypeId?: number | null;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    items?: ClientAttachmentItemDto[] | null;
  }

  /** 客户附件项DTO（扩展版，包含详细信息） */
  export interface ClientAttachmentItemDto extends AttachmentItemForItemInputDto {
    moduleTypeId?: string | null;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    isFirstShow?: boolean;
    mediaType?: number;
    friendlyFileName?: string | null;
    fileLength?: number | null;
    creationTime?: string | null;
    creatorUserId?: number | null;
    creatorUserName?: string | null;
  }

  /** 添加客户附件参数 */
  export interface ClientAttachmentsAddDto {
    id: string;
    attachments?: AttachmentItemForItemInputDto[] | null;
  }

  /** 删除客户附件参数 */
  export interface ClientAttachmentsDeleteDto {
    id: string;
    attachmentIds?: number[] | null;
  }

  /** 获取客户所有账期附件列表响应（扁平列表） */
  export interface ClientBillingPeriodAttachmentDto {
    /** 关联id */
    id?: number;
    /** 附件id */
    attachmentId?: number;
    /** 附件详细类型id */
    attachmentDtlTypeId?: number;
    /** 附件详细类型简易对象 */
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    /** 客户是否可见 */
    clientVisible?: boolean;
    /** 顺序 */
    displayOrder?: number;
    /** 下载地址 */
    url?: string;
    /** 文件类型 */
    mediaType?: number;
    /** 显示文件名 */
    friendlyFileName?: string | null;
    /** 文件大小 */
    fileLength?: number | null;
    /** 上传时间 */
    creationTime?: string | null;
    /** 上传人id */
    creatorUserId?: number | null;
    /** 上传人昵称 */
    creatorUserName?: string | null;
  }

  /** 附件详细类型简易DTO */
  export interface AttachmentDtlTypeSimpleDto {
    id: number;
    name?: string | null;
    sortId?: number;
  }
}

const API_PREFIX = '/services/app/ClientAdmin';

/**
 * 客户全称校验
 */
export const clientNameCheck = (data: ClientAdminApi.ClientNameCheckDto) => {
  return requestClient.post<void>(`${API_PREFIX}/CheckDuplicateAsync`, data);
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

/**
 * 获取客户附件分组列表
 */
export const getClientAttachments = (id: string) => {
  return requestClient.get<ClientAdminApi.ClientAttachmentGroupDto[]>(
    `${API_PREFIX}/GetAttachmentsAsync`,
    { params: { Id: id } },
  );
};

/**
 * 添加客户附件
 */
export const addClientAttachments = (
  data: ClientAdminApi.ClientAttachmentsAddDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/AddAttachmentsAsync`, data);
};

/**
 * 删除客户附件
 */
export const deleteClientAttachments = (
  data: ClientAdminApi.ClientAttachmentsDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAttachmentsAsync`, {
    data,
  });
};

/**
 * 获取客户所有账期的附件列表（不分组，扁平）
 * @param id 客户Id
 */
export const getClientBillingPeriodAttachments = (id: string) => {
  return requestClient.get<ClientAdminApi.ClientBillingPeriodAttachmentDto[]>(
    `${API_PREFIX}/GetBillingPeriodAttachmentsAsync`,
    { params: { Id: id } },
  );
};

/**
 * 加入失信
 */
export const addDishonest = (data: { id: string; dishonestRemark: string }) => {
  return requestClient.put<void>(`${API_PREFIX}/AddDishonestAsync`, data);
};

/**
 * 取消失信
 */
export const cancelDishonest = (data: ClientAdminApi.GuidIdDto) => {
  return requestClient.put<void>(`${API_PREFIX}/CancelDishonestAsync`, data);
};
