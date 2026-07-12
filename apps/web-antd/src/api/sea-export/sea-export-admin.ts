import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { UserAttribute } from '#/api/system/user-admin';
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

import { requestClient } from '#/api/request';

export namespace SeaExportAdminApi {
  export interface ServiceTypeByPolDto {
    serviceType: number;
    sortId: number;
    checked: boolean;
    /** 服务项责任角色（位标志，与港口服务项配置 userAttribute 一致） */
    userAttribute?: number;
    seServiceShows?: number[];
    seServiceLocks?: number[];
    seServiceRequires?: number[];
  }

  export interface GetServiceTypesByPolParams {
    /** 起运港 id */
    polId?: number | string;
    /** 委托单位 id（用于排除客户排除的服务项） */
    clientId?: number | string;
  }

  /**
   * 服务项目入参（新增/编辑）。
   * sortId 为优先级（数值越小优先级越高，相同值代表同优先级并行任务），由前端传入。
   */
  export interface SeaExportServiceItemDto {
    /** 服务项类型（ServiceType 枚举） */
    serviceType: number;
    /** 排序 id / 优先级 */
    sortId: number;
  }

  /** 业务箱型新增输入 */
  export interface OrderCtnAddDto {
    /** 箱型id */
    ctnCodeId?: number;

    ctnCodeName?: string;
    /** 箱号 */
    ctnNo?: string;
    /** 封号 */
    sealNo?: string;
    /** 件数 */
    pkgs?: number;
    /** 包装id */
    codePackageId?: number;
    /** 毛重 */
    grossWeight?: number;
    /** 皮重 */
    tareWeight?: number;
    /** 超长 */
    overLength?: number;
    /** 超宽 */
    overWidth?: number;
    /** 超高 */
    overHeight?: number;
    /** 体积 */
    volume?: number;
    /** 商品信息(品名)id */
    codeGoodsId?: number;
    /** 订舱号 */
    bookingNo?: string;
    /** 备注 */
    remark?: string;
  }

  /** 业务商品信息新增输入 */
  export interface OrderCodeGoodsAddDto {
    /** 商品信息id */
    codeGoodsId?: number;
  }

  /** 业务相关用户新增输入 */
  export interface OrderUserAddDto {
    /** 用户Id */
    userId?: number;
    /** 用户属性 */
    userAttribute?: UserAttribute;
    /** 排序id */
    sortId?: number;
    /** 备注 */
    remark?: string;
    /** 用户Ids */
    userIdList?: number[];
  }

  export interface OrderUserDto {
    transportOrderId: string;
    userId: number;
    userNickName?: string;
    userAttribute: UserAttribute;
    sortId: number;
    remark?: string;
    id: number;
  }

  export interface TransportOrderAddDto {
    commissionNum?: string;
    accountDate?: string;
    settlementDate?: string;
    codeSourceId?: number;
    isBusinessLocking?: boolean;
    feeLocked?: boolean;
    mblNum?: string;
    bookingNum?: string;
    codeFrtId?: number;
    prepareAtId?: number;
    codeServiceId?: number;
    cargoId?: number;
    tradeTermsType?: number;
    internalRemark?: string;
    marks?: string;
    pkgs?: number;
    codePackageId?: number;
    goodsDes?: string;
    kgs?: number;
    cbm?: number;
    clientId: number;
    teamId?: number;
    custBrokerId?: number;
    warehouseId?: number;
    insuranceId?: number;
    consigneeId?: number;
    consigneeContent?: string;
    shipperId?: number;
    shipperContent?: string;
    notifierId?: number;
    notifierContent?: string;
    sortId?: number;
    remark?: string;
    goodsCompleteTime?: string;
    etd?: string;
    atd?: string;
    eta?: string;
    /** 品名列表 */
    orderCodeGoodss?: OrderCodeGoodsAddDto[];
    /** 箱型箱量列表 */
    orderCtns?: OrderCtnAddDto[];
    /** 业务相关用户列表 */
    orderUsers?: OrderUserAddDto[];
    /** 费用列表 */
    orderFees?: OrderFeeAdminApi.OrderFeeDto[];

    feeLockedUserId?: number;
    feeLockedTime?: string;
    feeUnLockedUserId?: number;
    feeUnLockedTime?: string;
    codeSourceName?: string;
    codeFrtName?: string;
    codeServiceName?: string;
    clientName?: string;
    teamName?: string;
    custBrokerName?: string;
    warehouseName?: string;
    insuranceName?: string;
    consigneeName?: string;
    shipperName?: string;
    notifierName?: string;
    totalCtn?: string;
    teu?: number;
    codePackageName?: string;
    /** 危品等级 */
    dgLevel?: string;
    /** 危品编号 */
    dgNo?: string;
    /** 危品页号 */
    dgPageNo?: string;
    /** 危品标签 */
    dgLabel?: string;
    /** 危品包装类别 */
    dgPackingCategory?: string;
    /** 危品联系人 */
    dgContact?: string;
    /** 危品电话 */
    dgTel?: string;
    /** 净重 */
    dgNetWeight?: string;
    /** 闪点 */
    dgFlashPoint?: string;
    /** 装箱编号 */
    dgPackingNo?: string;
    /** 是否海污 */
    dgMarinePollution?: boolean;
    /** 温度 */
    reeferTemperature?: string;
    /** 通风 */
    reeferVentilation?: string;
    /** 湿度 */
    reeferHumidity?: string;
    /** 最低温度 */
    reeferMinTemperature?: string;
    /** 最高温度 */
    reeferMaxTemperature?: string;
    /** 温度单位（0=℃、1=℉） */
    reeferTemperatureUnit?: number;
    /** 通风口是否打开 */
    reeferVentOpen?: boolean;
  }

  export interface TransportOrderEditDto extends TransportOrderAddDto {
    id: string;
  }

  export interface TransportOrderDto extends TransportOrderAddDto {
    id: string;
    orderUsers?: OrderUserDto[];
    bizType?: number;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
  }

  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    localCurrencyId?: number;
  }

  export interface SeaExportServiceTaskUserDto {
    id?: string;
    seServiceTaskId?: string;
    userId: number;
    userNickName?: string;
    completionTime?: string | null;
  }

  export interface SeaExportServiceTaskDto {
    id: string;
    serviceTaskStatus: 0 | 1;
    completionUserId?: number | null;
    completionUserNickName?: string | null;
    completionTime?: string | null;
    seServiceTaskUsers?: SeaExportServiceTaskUserDto[];
  }

  export interface SeaExportServiceDto {
    id: number;
    seaExportId: string;
    serviceType: number;
    sortId: number;
    seServiceTask?: SeaExportServiceTaskDto | null;
  }

  export interface SeaExportAddDto {
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    podAgentId?: number;
    podAgentContent?: string;
    bookingAgentId?: number;
    shipAgentId?: number;
    yardId?: number;
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    signingPortId?: number;
    podId?: number;
    podRemark?: string;
    polId?: number;
    polRemark?: string;
    poT1Id?: number;
    poT1Remark?: string;
    poT2Id?: number;
    poT2Remark?: string;
    receivePortId?: number;
    receivePortRemark?: string;
    deliverPortId?: number;
    deliverPortRemark?: string;
    sortId?: number;
    remark?: string;
    serviceTypes?: SeaExportServiceItemDto[];
    organizationUnits?: OrganizationUnitSimpleDto[];
    transportOrder?: TransportOrderAddDto;
  }

  export interface SeaExportEditDto {
    id: number | string;
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    podAgentId?: number;
    podAgentContent?: string;
    bookingAgentId?: number;
    shipAgentId?: number;
    yardId?: number;
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    signingPortId?: number;
    podId?: number;
    podRemark?: string;
    polId?: number;
    polRemark?: string;
    poT1Id?: number;
    poT1Remark?: string;
    poT2Id?: number;
    poT2Remark?: string;
    receivePortId?: number;
    receivePortRemark?: string;
    deliverPortId?: number;
    deliverPortRemark?: string;
    sortId?: number;
    remark?: string;
    serviceTypes?: SeaExportServiceItemDto[];
    organizationUnits?: OrganizationUnitSimpleDto[];
    transportOrder?: TransportOrderEditDto;
  }

  export interface SeaExportDto {
    id: number | string;
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    secondNotifier?: ClientAdminApi.ClientDto;
    secondNotifierName?: string;
    podAgentId?: number;
    podAgentContent?: string;
    podAgent?: ClientAdminApi.ClientDto;
    podAgentName?: string;
    bookingAgentId?: number;
    bookingAgent?: ClientAdminApi.ClientDto;
    bookingAgentName?: string;
    shipAgentId?: number;
    shipAgent?: ClientAdminApi.ClientDto;
    shipAgentName?: string;
    yardId?: number;
    yard?: ClientAdminApi.ClientDto;
    yardName?: string;
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式名称（新版字段） */
    codeIssueTypeName?: string;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    carrier?: CarrierAdminApi.CarrierDto;
    carrierName?: string;
    /** 船公司代码 */
    carrierCode?: string;
    /** 船公司中文简称 */
    carrierCnShortName?: string;
    carrierLogo?: CarrierAdminApi.AttachmentItemDto | null;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    prepareAtId?: number;
    prepareAtName?: string;
    prepareAtEdiCode?: string;
    signingPortId?: number;
    signingPortName?: string;
    signingPortEdiCode?: string;
    podId?: number;
    podName?: string;
    podEdiCode?: string;
    podRemark?: string;
    polId?: number;
    polName?: string;
    polEdiCode?: string;
    polRemark?: string;
    poT1Id?: number;
    poT1Name?: string;
    poT1EdiCode?: string;
    poT1Remark?: string;
    poT2Id?: number;
    poT2Name?: string;
    poT2EdiCode?: string;
    poT2Remark?: string;
    receivePortId?: number;
    receivePortName?: string;
    receivePortEdiCode?: string;
    receivePortRemark?: string;
    deliverPortId?: number;
    deliverPortName?: string;
    deliverPortEdiCode?: string;
    deliverPortRemark?: string;
    laneName?: string;
    creatorUserNickName?: string;
    sortId?: number;
    remark?: string;
    seaExportServices?: SeaExportServiceDto[];
    organizationUnits?: OrganizationUnitSimpleDto[];
    companys?: OrganizationUnitSimpleDto[];
    transportOrder?: TransportOrderDto;
    /** 应付费用最小状态（该方向无费用时为 null） */
    feeStatusPay?: number | null;
    /** 应收费用最小状态（该方向无费用时为 null） */
    feeStatusReceive?: number | null;
    /** 应付费用组合状态（含更改单、结算等；该方向无费用时为 null） */
    payFeeStatus?: number | null;
    /** 应收费用组合状态（含更改单、结算等；该方向无费用时为 null） */
    receiveFeeStatus?: number | null;
    /** 是否已发起过海运运单运踪订阅（存在订阅记录即为 true） */
    isYundangSubscribed?: boolean;
    /** 当前订阅记录是否订阅成功（对应订阅表 isSuccess） */
    isYundangSubscribeSuccess?: boolean;
    /** 运单最新运踪状态（列表展示，有推送时由后端填充） */
    yundangTrackStatus?: string;
    /** 运单当前海运节点（列表展示运踪状态文案取 stateDescCN） */
    yundangShipmentOceanNode?: null | YundangAdminApi.YundangShipmentOceanNodeInfoDto;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
  }

  export interface PagedListOfSeaExportDto {
    skipCount?: number;
    maxResultCount?: number;
    items: SeaExportDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 海运出口分组统计字段 */
  export enum SeaExportGroupField {
    /** 装运方式 */
    BLType = 1,
    /** 订单类型 */
    BillType = 2,
    /** 委托单位 */
    Client = 3,
    /** 船公司 */
    Carrier = 4,
    /** 起运港 */
    POL = 5,
    /** 目的港 */
    POD = 6,
    /** 船名 */
    Vessel = 7,
    /** 付费方式 */
    CodeFrt = 8,
    /** 签单方式 */
    CodeIssueType = 9,
    /** 场站 */
    Yard = 10,
  }

  /** 分组统计单项 */
  export interface SeaExportGroupDto {
    /** 分组值 id（无值为 null） */
    id: null | number | string;
    /** 分组名称（无值为 null） */
    name: null | string;
    /** 该分组数据总条数 */
    count: number;
  }

  export interface GetPagedListParams {
    Keyword?: string;
    ETDStart?: string;
    ETDEnd?: string;
    ClientId?: string | number;
    POLId?: number;
    PODId?: number;
    Vessel?: string;
    InnerVoyno?: string;
    CarrierId?: number;
    BookingAgentId?: string | number;
    /** 场站 id（往来单位，精确匹配） */
    YardId?: string | number;
    /** 仅返回场站未填写记录（与 YardId 互斥） */
    YardIdEmpty?: boolean;
    SaleId?: number;
    OperationId?: number;
    BusinessId?: number;
    CustomerServiceId?: number;
    DocumentationId?: number;
    OrgId?: number;
    TeamId?: string | number;
    CustBrokerId?: string | number;
    CtnNo?: string;
    CloseDocTimeStart?: string;
    CloseDocTimeEnd?: string;
    Remark?: string;
    CargoId?: number;
    GoodsDes?: string;
    CodeSourceId?: number;
    CodeIssueTypeId?: number;
    BLType?: number;
    TradeTermsType?: number;
    BillType?: number;
    FeeLocked?: boolean;
    IsBusinessLocking?: boolean;
    /** 付费方式 id（用于点击「付费方式」分组项后筛选列表） */
    CodeFrtId?: number | string;
    /** 仅返回装运方式未填写记录（与 BLType 互斥） */
    BLTypeEmpty?: boolean;
    /** 仅返回订单类型未填写记录（与 BillType 互斥） */
    BillTypeEmpty?: boolean;
    /** 仅返回船名未填写记录（与 Vessel 互斥） */
    VesselEmpty?: boolean;
    /** 仅返回船公司未填写记录（与 CarrierId 互斥） */
    CarrierIdEmpty?: boolean;
    /** 仅返回起运港未填写记录（与 POLId 互斥） */
    POLIdEmpty?: boolean;
    /** 仅返回目的港未填写记录（与 PODId 互斥） */
    PODIdEmpty?: boolean;
    /** 仅返回付费方式未填写记录（与 CodeFrtId 互斥） */
    CodeFrtIdEmpty?: boolean;
    /** 仅返回签单方式未填写记录（与 CodeIssueTypeId 互斥） */
    CodeIssueTypeIdEmpty?: boolean;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** 分组统计入参：列表查询参数 + 分组字段 */
  export interface GetGroupedListParams extends GetPagedListParams {
    /** 分组字段，1装运方式~9签单方式 */
    GroupField: SeaExportGroupField;
  }

  /** 海运出口复制入参 */
  export interface SeaExportCopyDto {
    /** 源海运出口 id（与 DeleteAsync 一致） */
    id: string;
    /** 是否复制费用（仅 ChangeOrderId 为空的费用） */
    copyOrderFees: boolean;
  }

  export interface AttachmentDtlTypeSimpleDto {
    id: number;
    name?: string | null;
    sortId?: number;
  }

  export interface AttachmentItemForItemInputDto {
    attachmentId: number;
    attachmentDtlTypeId?: number | null;
    clientVisible?: boolean;
    displayOrder?: number;
    itemId?: string | null;
    url?: string | null;
    id?: number | null;
  }

  export interface AttachmentItemDto extends AttachmentItemForItemInputDto {
    moduleTypeId?: string | null;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    isFirstShow?: boolean;
    mediaType?: number;
    friendlyFileName?: string | null;
    fileLength?: number | null;
    creationTime?: string | null;
    creatorUserId?: number | null;
    creatorUserNickName?: string | null;
  }

  export interface AttachmentGroupDto {
    attachmentDtlTypeId?: number | null;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    items?: AttachmentItemDto[] | null;
  }

  export interface SeaExportAttachmentsAddDto {
    id: string;
    attachments?: AttachmentItemForItemInputDto[] | null;
  }

  export interface SeaExportAttachmentsDeleteDto {
    id: string;
    attachmentIds?: number[] | null;
  }

  /** GET GetDates 请求参数 */
  export interface GetSeaExportDatesParams {
    vessel: string;
    innerVoyno: string;
    etd: string;
  }

  /** GET GetDates 响应；无历史数据时为 null */
  export interface SeaExportDatesDto {
    atd?: string | null;
    eta?: string | null;
    closeVgmTime?: string | null;
    closeDocTime?: string | null;
    closeManifestTime?: string | null;
  }
}

const API_PREFIX = '/services/app/SeaExportAdmin';

export const getSeaExportPagedList = (
  params: SeaExportAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeaExportAdminApi.PagedListOfSeaExportDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getSeaExportGroupedList = (
  params: SeaExportAdminApi.GetGroupedListParams,
) => {
  return requestClient.get<SeaExportAdminApi.SeaExportGroupDto[]>(
    `${API_PREFIX}/GetGroupedListAsync`,
    { params },
  );
};

export const getSeaExportDetail = (id: string | number) => {
  return requestClient.get<SeaExportAdminApi.SeaExportDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

export const getServiceTypesByPOL = (
  params: SeaExportAdminApi.GetServiceTypesByPolParams,
) => {
  return requestClient.get<SeaExportAdminApi.ServiceTypeByPolDto[] | null>(
    `${API_PREFIX}/GetServiceTypesByPOLAsync`,
    { params },
  );
};

export const addSeaExport = (data: SeaExportAdminApi.SeaExportAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

export const editSeaExport = (data: SeaExportAdminApi.SeaExportEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteSeaExport = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};

export const copySeaExport = (data: SeaExportAdminApi.SeaExportCopyDto) => {
  return requestClient.post<string>(`${API_PREFIX}/CopyAsync`, data);
};

/** 获取海运出口附件（按附件详细类型分组） */
export const getSeaExportAttachments = (id: string) => {
  return requestClient.get<SeaExportAdminApi.AttachmentGroupDto[]>(
    `${API_PREFIX}/GetAttachmentsAsync`,
    { params: { Id: id } },
  );
};

/** 给海运出口添加附件 */
export const addSeaExportAttachments = (
  data: SeaExportAdminApi.SeaExportAttachmentsAddDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/AddAttachmentsAsync`, data);
};

/** 删除海运出口附件关联 */
export const deleteSeaExportAttachments = (
  data: SeaExportAdminApi.SeaExportAttachmentsDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAttachmentsAsync`, {
    data,
  });
};

/** 根据船名、航次、开船日期查询历史票证日期组合 */
export const getSeaExportDates = (
  params: SeaExportAdminApi.GetSeaExportDatesParams,
) => {
  return requestClient.get<SeaExportAdminApi.SeaExportDatesDto | null>(
    `${API_PREFIX}/GetDatesAsync`,
    { params },
  );
};
