import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/PreOrderAdmin';

/** 业务联系单 ModuleType（与后端 ModuleType.PreOrder 一致） */
export const PRE_ORDER_MODULE_TYPE_ID = 160_050;

/** 业务联系单状态 */
export enum PreOrderStatus {
  /** 录入状态 */
  Entering = 0,
  /** 待审核 */
  Auditing = 1,
  /** 通过 */
  Passed = 2,
  /** 驳回 */
  Rejected = 3,
}

/** 业务类型（业务联系单本期仅海运出口） */
export enum PreOrderBizType {
  SeaExport = 0,
  SeaImport = 1,
}

export const PRE_ORDER_BIZ_TYPE_TEXT: Partial<Record<PreOrderBizType, string>> =
  {
    [PreOrderBizType.SeaExport]: '海运出口',
  };

/** 标题栏业务类型下拉选项（本期仅开放已落地的类型） */
export function getPreOrderBizTypeOptions() {
  return Object.entries(PRE_ORDER_BIZ_TYPE_TEXT).map(([value, label]) => ({
    label: label as string,
    value: Number(value),
  }));
}

/** 服务项与海运出口的对比结果 */
export enum PreOrderServiceCompareStatus {
  /** 相同 */
  Same = 0,
  /** 海运出口新增（业务联系单没有） */
  SeaExportAdded = 1,
  /** 海运出口删除（业务联系单有、海运出口没有） */
  SeaExportRemoved = 2,
}

export const PRE_ORDER_STATUS_TEXT: Record<number, string> = {
  [PreOrderStatus.Entering]: '录入状态',
  [PreOrderStatus.Auditing]: '待审核',
  [PreOrderStatus.Passed]: '通过',
  [PreOrderStatus.Rejected]: '驳回',
};

export namespace PreOrderAdminApi {
  /** 用户属性（与后端 UserAttribute 一致，按位取值） */
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

  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    localCurrencyId?: number;
  }

  export interface SimpleNamedDto {
    id?: number | string;
    name?: string;
    code?: string;
    enName?: string;
    cnName?: string;
    /** 港口对象的英文港口名 */
    portName?: string;
  }

  /** 品名子表 */
  export interface PreOrderCodeGoodsDto {
    id?: number;
    preOrderId?: string;
    codeGoodsId?: number;
    codeGoods?: SimpleNamedDto | null;
  }

  /** 箱型箱量子表 */
  export interface PreOrderCtnDto {
    id?: number;
    preOrderId?: string;
    ctnCodeId?: number;
    /** 箱量 */
    count?: number;
    /** 指导价 */
    sugPrice?: number | null;
    /** 卖价 */
    price?: number | null;
    /** 货重 */
    weight?: number | null;
    remark?: string | null;
    ctnCode?: SimpleNamedDto | null;
  }

  /** 干系人子表 */
  export interface PreOrderUserDto {
    id?: number;
    preOrderId?: string;
    userId?: number;
    userNickName?: string | null;
    userAttribute?: UserAttribute;
    sortId?: number;
    remark?: string | null;
  }

  /** 服务项子表 */
  export interface PreOrderServiceDto {
    id?: number;
    preOrderId?: string;
    serviceType?: number;
    sortId?: number;
    /** 与海运出口服务项对比结果（详情只读，无需回传） */
    compareStatus?: PreOrderServiceCompareStatus;
  }

  /** 费用子表 */
  export interface PreOrderFeeDto {
    id?: string;
    preOrderId?: string;
    /** 收付类型：0 应收 / 1 应付 */
    paySide?: number | null;
    feeCodeId?: number | null;
    industryCategory?: number | null;
    settlementId?: string | null;
    currencyId?: number | null;
    exchangeRate?: number | null;
    /** 含税单价 */
    unitPrice?: number | null;
    /** 不含税单价 */
    noTaxUnitPrice?: number | null;
    amount?: number | null;
    /** 单位字符串（票/重量/体积/TEU） */
    unit?: string | null;
    quantity?: number | null;
    /** 税率(%) */
    taxRate?: number | null;
    invoiceBlocked?: boolean;
    isConfidential?: boolean;
    remark?: string | null;
    feeCode?: SimpleNamedDto | null;
    settlement?: SimpleNamedDto | null;
    currency?: SimpleNamedDto | null;
  }

  /** 业务联系单（列表不含子表，详情含全部子表） */
  export interface PreOrderDto {
    id: string;
    tenantId?: number;
    bizType?: PreOrderBizType;
    status?: PreOrderStatus;
    orgId?: number | null;
    preOrderNum?: string | null;
    /** 审核通过后生成的业务表id，与业务联系单 id 一致 */
    transportOrderId?: string | null;
    blType?: number;
    clientId?: string;
    mblNum?: string | null;
    goodsCompleteTime?: string | null;
    etd?: string | null;
    carrierId?: number | null;
    /** 船公司 Logo（列表展示，对齐海运出口） */
    carrierLogo?: CarrierAdminApi.AttachmentItemDto | null;
    receivePortId?: number | null;
    receivePortRemark?: string | null;
    polId?: number | null;
    polRemark?: string | null;
    /** 中转港1 ID（JSON 字段名为 poT1Id，与海运出口一致） */
    poT1Id?: number | null;
    poT1Remark?: string | null;
    poT2Id?: number | null;
    poT2Remark?: string | null;
    podId?: number | null;
    podRemark?: string | null;
    deliverPortId?: number | null;
    deliverPortRemark?: string | null;
    codeFrtId?: number | null;
    codeServiceId?: number | null;
    tradeTermsType?: number | null;
    remark?: string | null;
    consigneeId?: string | null;
    consigneeContent?: string | null;
    shipperId?: string | null;
    shipperContent?: string | null;
    notifierId?: string | null;
    notifierContent?: string | null;
    /**
     * 订舱代理id（国内代理）。仅海运出口/空运出口有；审核通过写入 SeaExport.BookingAgentId
     */
    bookingAgentId?: string | null;
    cargoId?: number;
    pkgs?: number | null;
    codePackageId?: number | null;
    kgs?: number | null;
    cbm?: number | null;
    creatorUserName?: string | null;
    creationTime?: string | null;
    creatorUserId?: number | null;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
    userId?: number;
    orgs?: OrganizationUnitSimpleDto[] | null;
    client?: SimpleNamedDto | null;
    carrier?: SimpleNamedDto | null;
    receivePort?: SimpleNamedDto | null;
    pol?: SimpleNamedDto | null;
    pot1?: SimpleNamedDto | null;
    pot2?: SimpleNamedDto | null;
    pod?: SimpleNamedDto | null;
    deliverPort?: SimpleNamedDto | null;
    codeFrt?: SimpleNamedDto | null;
    codeService?: SimpleNamedDto | null;
    codePackage?: SimpleNamedDto | null;
    consignee?: SimpleNamedDto | null;
    shipper?: SimpleNamedDto | null;
    notifier?: SimpleNamedDto | null;
    /** 订舱代理（仅详情返回；列表只返回 bookingAgentId） */
    bookingAgent?: SimpleNamedDto | null;
    preOrderCodeGoodss?: PreOrderCodeGoodsDto[] | null;
    preOrderCtns?: PreOrderCtnDto[] | null;
    preOrderUsers?: PreOrderUserDto[] | null;
    preOrderServices?: PreOrderServiceDto[] | null;
    preOrderFees?: PreOrderFeeDto[] | null;
    attachmentGroup?: SeaExportAdminApi.AttachmentGroupDto[] | null;
  }

  /** 新增入参（子表全量提交） */
  export interface PreOrderAddDto {
    bizType: PreOrderBizType;
    orgId?: number | null;
    blType?: number;
    clientId?: string;
    mblNum?: string | null;
    goodsCompleteTime?: string | null;
    etd?: string | null;
    carrierId?: number | null;
    receivePortId?: number | null;
    receivePortRemark?: string | null;
    polId?: number | null;
    polRemark?: string | null;
    /** 中转港1 ID（JSON 字段名为 poT1Id，与海运出口一致） */
    poT1Id?: number | null;
    poT1Remark?: string | null;
    poT2Id?: number | null;
    poT2Remark?: string | null;
    podId?: number | null;
    podRemark?: string | null;
    deliverPortId?: number | null;
    deliverPortRemark?: string | null;
    codeFrtId?: number | null;
    codeServiceId?: number | null;
    tradeTermsType?: number | null;
    remark?: string | null;
    consigneeId?: string | null;
    consigneeContent?: string | null;
    shipperId?: string | null;
    shipperContent?: string | null;
    notifierId?: string | null;
    notifierContent?: string | null;
    /** 订舱代理id（国内代理）；仅出口业务有，进口无此字段 */
    bookingAgentId?: string | null;
    cargoId?: number;
    pkgs?: number | null;
    codePackageId?: number | null;
    kgs?: number | null;
    cbm?: number | null;
    preOrderCodeGoodss?: { codeGoodsId: number }[] | null;
    preOrderCtns?: Omit<PreOrderCtnDto, 'ctnCode' | 'id' | 'preOrderId'>[];
    preOrderUsers?: Omit<PreOrderUserDto, 'id' | 'preOrderId'>[];
    preOrderServices?: { serviceType: number; sortId?: number }[];
    preOrderFees?: Omit<
      PreOrderFeeDto,
      'currency' | 'feeCode' | 'id' | 'preOrderId' | 'settlement'
    >[];
    attachmentGroup?: AttachmentGroupInputDto[] | null;
  }

  /** 附件项（新增/编辑入参；url/friendlyFileName 仅前端展示，后端可忽略） */
  export interface AttachmentItemInputDto {
    attachmentId: number | string;
    attachmentDtlTypeId?: number | null;
    clientVisible?: boolean;
    displayOrder?: number;
    friendlyFileName?: string | null;
    url?: string | null;
  }

  export interface AttachmentGroupInputDto {
    attachmentDtlTypeId?: number | null;
    items?: AttachmentItemInputDto[];
  }

  export interface PreOrderEditDto extends PreOrderAddDto {
    id: string;
  }

  /** 业务联系单分组统计字段（与海运出口同名字段取值一致，11 为业务联系单专属） */
  export enum PreOrderGroupField {
    /** 委托单位 */
    Client = 3,
    /** 船公司 */
    Carrier = 4,
    /** 起运港 */
    POL = 5,
    /** 目的港 */
    POD = 6,
    /** 业务类型 */
    BizType = 11,
  }

  /** 分组统计单项 */
  export interface PreOrderGroupDto {
    /** 分组值 id（无值为 null） */
    id: null | number | string;
    /** 分组名称（无值为 null） */
    name: null | string;
    /** 该分组数据总条数 */
    count: number;
    /** 分组项 logo 附件（仅船公司分组返回） */
    logo?: SeaExportAdminApi.AttachmentItemDto | null;
  }

  /** 列表查询参数 */
  export interface PreOrderQueryParams {
    Keyword?: string;
    PreOrderNum?: string;
    BizType?: number;
    Status?: number;
    ClientId?: string;
    CarrierId?: number | string;
    POLId?: number;
    PODId?: number;
    ETDStart?: string;
    ETDEnd?: string;
    CreatorUserId?: number;
    OrgId?: number;
    /** 仅返回船公司未填写记录（与 CarrierId 互斥） */
    CarrierIdEmpty?: boolean;
    /** 仅返回起运港未填写记录（与 POLId 互斥） */
    POLIdEmpty?: boolean;
    /** 仅返回目的港未填写记录（与 PODId 互斥） */
    PODIdEmpty?: boolean;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** 分组统计入参：列表查询参数 + 分组字段 */
  export interface GetGroupedListParams extends PreOrderQueryParams {
    GroupField: PreOrderGroupField;
  }

  export interface PagedListOfPreOrderDto {
    skipCount: number;
    maxResultCount: number;
    items?: PreOrderDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 审核任务列表查询参数 */
  export interface PreOrderTaskQueryParams {
    Keyword?: string;
    PreOrderNum?: string;
    BizType?: number;
    PreOrderStatus?: number;
    ClientId?: string;
    POLId?: number;
    PODId?: number;
    ETDStart?: string;
    ETDEnd?: string;
    PreOrderCreatorUserId?: number;
    OrgId?: number;
    TaskStatus?: number;
    MyStatus?: number;
    AuditUserId?: number;
    AuditTimeStart?: string;
    AuditTimeEnd?: string;
    Remark?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  export interface WorkFlowInstanceItemDetailDto {
    userId: number;
    userNickName?: string;
    taskStatus: number;
    comment?: string;
    auditTime?: string;
    id: string;
  }

  export interface WorkFlowInstanceItemGroupDto {
    level: number;
    passMethod: number;
    itemList?: WorkFlowInstanceItemDetailDto[];
  }

  export interface WorkFlowInstanceDetailDto {
    status: number;
    levelGroup?: WorkFlowInstanceItemGroupDto[];
    id: string;
  }

  /** 审核任务项（任务信息 + 业务联系单信息） */
  export interface PreOrderTaskItemDto {
    id: string;
    taskType?: number;
    taskStatus?: number;
    myStatus?: number | null;
    taskItemWorkFlowInstance?: WorkFlowInstanceDetailDto | null;
    frightModule?: number;
    entityId?: string;
    auditUserId?: number | null;
    auditUserName?: string | null;
    auditTime?: string | null;
    remark?: string | null;
    creatorUserName?: string | null;
    preOrderId?: string;
    preOrder?: PreOrderDto | null;
  }

  export interface PagedListOfPreOrderTaskItemDto {
    skipCount: number;
    maxResultCount: number;
    items?: PreOrderTaskItemDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  export interface PreOrderAuditDto {
    id: string;
    success: boolean;
    remark?: string;
    /** 指派/修改「操作」干系人 */
    operationUserId?: number | null;
  }
}

/** 业务联系单分页列表（不含子表） */
export const getPreOrderPagedList = (
  params: PreOrderAdminApi.PreOrderQueryParams,
) => {
  return requestClient.get<PreOrderAdminApi.PagedListOfPreOrderDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/** 业务联系单分组统计（筛选条件与列表一致，按 groupField 汇总） */
export const getPreOrderGroupedList = (
  params: PreOrderAdminApi.GetGroupedListParams,
) => {
  return requestClient.get<PreOrderAdminApi.PreOrderGroupDto[]>(
    `${API_PREFIX}/GetGroupedListAsync`,
    { params },
  );
};

/** 业务联系单详情（含全部子表与服务项对比标记） */
export const getPreOrderDetail = (id: string) => {
  return requestClient.get<PreOrderAdminApi.PreOrderDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/** 新增业务联系单，返回新单 id */
export const addPreOrder = (data: PreOrderAdminApi.PreOrderAddDto) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/** 修改业务联系单（子表与附件全量覆盖） */
export const editPreOrder = (data: PreOrderAdminApi.PreOrderEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/** 删除业务联系单（仅录入/驳回） */
export const deletePreOrder = (id: string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};

/** 提交审核（录入/驳回 → 待审核） */
export const submitPreOrder = (id: string) => {
  return requestClient.post(`${API_PREFIX}/SubmitAsync`, { id });
};

/** 撤回（待审核 → 录入） */
export const unSubmitPreOrder = (id: string) => {
  return requestClient.post(`${API_PREFIX}/UnSubmitAsync`, { id });
};

/** 审核（通过/驳回），可同时指派「操作」干系人 */
export const auditPreOrder = (data: PreOrderAdminApi.PreOrderAuditDto) => {
  return requestClient.post(`${API_PREFIX}/AuditAsync`, data);
};

/** 审核后驳回（通过 → 驳回，须先删除关联海运出口） */
export const rejectPreOrder = (data: { id: string; remark?: string }) => {
  return requestClient.post(`${API_PREFIX}/RejectAsync`, data);
};

/** 待我审核 / 我审核过的业务联系单任务列表 */
export const getPreOrderTaskList = async (
  params: PreOrderAdminApi.PreOrderTaskQueryParams,
) => {
  const response =
    await requestClient.get<PreOrderAdminApi.PagedListOfPreOrderTaskItemDto>(
      `${API_PREFIX}/PreOrderTaskListAsync`,
      { params },
    );
  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
};

/** 在业务联系单侧查询关联业务(TransportOrder)详情 */
export const getPreOrderTransportOrderDetail = (id: string) => {
  return requestClient.get<Record<string, any>>(
    `${API_PREFIX}/TransportOrderDetailAsync`,
    { params: { Id: id } },
  );
};
