import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { UserAttribute } from '#/api/system/user-admin';
import type { YundangAdminApi } from '#/api/yundang/yundang-admin';

import { requestClient } from '#/api/request';

export namespace SeaExportAdminApi {
  /** 后端 Long 主键，序列化为 JSON 后可能超 JS 安全整数，统一按 number | string 处理 */
  export type LongId = number | string;

  export interface CountrySimpleDto {
    id: LongId;
    code?: null | string;
    countryName?: null | string;
    countryEnName?: null | string;
  }

  export interface LaneSimpleDto {
    id: LongId;
    code?: null | string;
    laneName?: null | string;
    laneEnName?: null | string;
    ediCode?: null | string;
  }

  /**
   * 港口简易对象（后端 PortCodeSimpleDtoForOrder）。
   * 列表/详情的港口均以该对象返回；海运出口界面航线/国家取自目的港：
   * 航线读 `pod.lane.laneName`，国家读 `pod.country.countryName` / `pod.country.countryEnName`。
   */
  export interface PortCodeSimpleDtoForOrder {
    id: LongId;
    /** 港口代码（英文名） */
    portName?: null | string;
    cnName?: null | string;
    ediCode?: null | string;
    lane?: LaneSimpleDto | null;
    country?: CountrySimpleDto | null;
  }

  /** 货源地简易对象（后端 CodeSourceSimpleDto） */
  export interface CodeSourceSimpleDto {
    id: LongId;
    code?: null | string;
    cnName?: null | string;
    enName?: null | string;
  }

  /** 付费方式简易对象（后端 CodeFrtSimpleDto） */
  export interface CodeFrtSimpleDto {
    id: LongId;
    cnName?: null | string;
    enName?: null | string;
  }

  /** 运输条款简易对象（后端 CodeServiceSimpleDto） */
  export interface CodeServiceSimpleDto {
    id: LongId;
    cnName?: null | string;
    enName?: null | string;
    ediCode?: null | string;
  }

  /** 包装简易对象（后端 CodePackageSimpleDto） */
  export interface CodePackageSimpleDto {
    id: LongId;
    name?: null | string;
    ediCode?: null | string;
  }

  /** 箱型简易对象（后端 CtnCodeSimpleDto） */
  export interface CtnCodeSimpleDto {
    id: LongId;
    ctnName?: null | string;
    /** 柜型：0 普柜，1 特种柜 */
    cabinetType?: 0 | 1;
    ctnSize?: null | string;
    ctnType?: null | string;
    teu?: null | number;
  }

  /** 品名简易对象（后端 CodeGoodsSimpleDto） */
  export interface CodeGoodsSimpleDto {
    id: LongId;
    code?: null | string;
    name?: null | string;
    enName?: null | string;
    hsCode?: null | string;
  }

  /** 签单方式简易对象（后端 CodeIssueTypeSimpleDto） */
  export interface CodeIssueTypeSimpleDto {
    id: LongId;
    /** 签单方式名称 */
    billType?: null | string;
    enName?: null | string;
  }

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

  /** 业务箱型输出（关联字典以对象返回） */
  export interface OrderCtnDto extends OrderCtnAddDto {
    id?: number;
    /** 箱型对象（替代 ctnCodeName） */
    ctnCode?: CtnCodeSimpleDto | null;
    /** 包装对象（替代 codePackageName） */
    codePackage?: CodePackageSimpleDto | null;
    /** 品名对象（替代 codeGoodsName / codeGoodsHSCode） */
    codeGoods?: CodeGoodsSimpleDto | null;
  }

  /** 业务商品信息新增输入 */
  export interface OrderCodeGoodsAddDto {
    /** 商品信息id */
    codeGoodsId?: number;
  }

  /** 业务商品信息输出（关联字典以对象返回） */
  export interface OrderCodeGoodsDto extends OrderCodeGoodsAddDto {
    id?: number;
    /** 品名对象（替代 codeGoodsName / codeGoodsHSCode） */
    codeGoods?: CodeGoodsSimpleDto | null;
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
    /** 合同号（可空，最长 64） */
    contractNum?: string;
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
    totalCtn?: string;
    teu?: number;
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
    /** 委托单位（业务往来单位简易对象，无则为 null） */
    client?: ClientAdminApi.ClientDto | null;
    /** 车队（业务往来单位简易对象，无则为 null） */
    team?: ClientAdminApi.ClientDto | null;
    /** 报关行（业务往来单位简易对象，无则为 null） */
    custBroker?: ClientAdminApi.ClientDto | null;
    /** 仓库（业务往来单位简易对象，无则为 null） */
    warehouse?: ClientAdminApi.ClientDto | null;
    /** 保险公司（业务往来单位简易对象，无则为 null） */
    insurance?: ClientAdminApi.ClientDto | null;
    /** 收货人（业务往来单位简易对象，无则为 null） */
    consignee?: ClientAdminApi.ClientDto | null;
    /** 发货人（业务往来单位简易对象，无则为 null） */
    shipper?: ClientAdminApi.ClientDto | null;
    /** 通知人（业务往来单位简易对象，无则为 null） */
    notifier?: ClientAdminApi.ClientDto | null;
    /** 货源地对象（替代 codeSourceName） */
    codeSource?: CodeSourceSimpleDto | null;
    /** 付费方式对象（替代 codeFrtName） */
    codeFrt?: CodeFrtSimpleDto | null;
    /** 运输条款对象（替代 codeServiceName） */
    codeService?: CodeServiceSimpleDto | null;
    /** 包装对象（替代 codePackageName） */
    codePackage?: CodePackageSimpleDto | null;
    /** 箱型箱量列表（字典以对象返回） */
    orderCtns?: OrderCtnDto[];
    /** 品名列表（字典以对象返回） */
    orderCodeGoodss?: OrderCodeGoodsDto[];
    orderUsers?: OrderUserDto[];
    bizType?: number;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    /** 未完结状态。true 未完结，false 已完结（默认） */
    isUnfinished?: boolean;
  }

  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    localCurrencyId?: null | number;
    localCurrencyCode?: null | string;
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
    /** 场站联系人 */
    yardContact?: string;
    /** 场站邮箱 */
    yardEmail?: string;
    /** 场站手机 */
    yardMobile?: string;
    /** 场站电话 */
    yardTel?: string;
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
    /** 归属组织id（必填） */
    orgId?: null | number;
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
    /** 场站联系人 */
    yardContact?: string;
    /** 场站邮箱 */
    yardEmail?: string;
    /** 场站手机 */
    yardMobile?: string;
    /** 场站电话 */
    yardTel?: string;
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
    /** 归属组织id（必填） */
    orgId?: null | number;
    transportOrder?: TransportOrderEditDto;
  }

  export interface SeaExportDto {
    id: number | string;
    blType?: number;
    billType?: number;
    secondNotifierId?: number;
    secondNotifierContent?: string;
    /** 第二通知人（业务往来单位简易对象，无则为 null） */
    secondNotifier?: ClientAdminApi.ClientDto | null;
    podAgentId?: number;
    podAgentContent?: string;
    /** 目的港代理（业务往来单位简易对象，无则为 null） */
    podAgent?: ClientAdminApi.ClientDto | null;
    bookingAgentId?: number;
    /** 订舱代理（业务往来单位简易对象，无则为 null） */
    bookingAgent?: ClientAdminApi.ClientDto | null;
    shipAgentId?: number;
    /** 船代（业务往来单位简易对象，无则为 null） */
    shipAgent?: ClientAdminApi.ClientDto | null;
    yardId?: number;
    /** 场站（业务往来单位简易对象，无则为 null） */
    yard?: ClientAdminApi.ClientDto | null;
    /** 场站联系人 */
    yardContact?: string;
    /** 场站邮箱 */
    yardEmail?: string;
    /** 场站手机 */
    yardMobile?: string;
    /** 场站电话 */
    yardTel?: string;
    /** 签单方式id（新版字段） */
    codeIssueTypeId?: number;
    /** 签单方式对象（替代 codeIssueTypeName，名称读 billType） */
    codeIssueType?: CodeIssueTypeSimpleDto | null;
    /** 签单方式id（旧字段，兼容） */
    issueType?: number;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: number;
    /**
     * 船公司简易对象（无则为 null）。
     * 含 cnName/cnShortName/enName/code（英文简称）/ediCode。
     */
    carrier?: CarrierAdminApi.CarrierDto | null;
    carrierLogo?: CarrierAdminApi.AttachmentItemDto | null;
    noBillEnum?: number;
    copyNoBillEnum?: number;
    closingTime?: string;
    closeVgmTime?: string;
    closeDocTime?: string;
    closeManifestTime?: string;
    signingTime?: string;
    prepareAtId?: number;
    /** 付费地点港口对象（无则为 null） */
    prepareAt?: PortCodeSimpleDtoForOrder | null;
    signingPortId?: number;
    /** 签单地点港口对象（无则为 null） */
    signingPort?: PortCodeSimpleDtoForOrder | null;
    podId?: number;
    /** 目的港对象（无则为 null）；航线/国家读 pod.lane / pod.country */
    pod?: PortCodeSimpleDtoForOrder | null;
    podRemark?: string;
    polId?: number;
    /** 起运港对象（无则为 null） */
    pol?: PortCodeSimpleDtoForOrder | null;
    polRemark?: string;
    poT1Id?: number;
    /** 中转港1对象（无则为 null） */
    pot1?: PortCodeSimpleDtoForOrder | null;
    poT1Remark?: string;
    poT2Id?: number;
    /** 中转港2对象（无则为 null） */
    pot2?: PortCodeSimpleDtoForOrder | null;
    poT2Remark?: string;
    receivePortId?: number;
    /** 收货地港口对象（无则为 null） */
    receivePort?: PortCodeSimpleDtoForOrder | null;
    receivePortRemark?: string;
    deliverPortId?: number;
    /** 交货地港口对象（无则为 null） */
    deliverPort?: PortCodeSimpleDtoForOrder | null;
    deliverPortRemark?: string;
    creatorUserNickName?: string;
    sortId?: number;
    remark?: string;
    seaExportServices?: SeaExportServiceDto[];
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
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
    /** 分组项 logo 附件（仅船公司分组返回，用于展示船司 logo） */
    logo?: AttachmentItemDto | null;
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
    /** 合同号（TransportOrder.ContractNum）模糊匹配 */
    ContractNum?: string;
    CloseDocTimeStart?: string;
    CloseDocTimeEnd?: string;
    /** 会计期间起（>=），一般为当月 1 号 */
    AccountDateStart?: string;
    /** 会计期间止（<=） */
    AccountDateEnd?: string;
    /** 外部备注（TransportOrder.Remark）模糊匹配 */
    Remark?: string;
    /** 内部备注（TransportOrder.InternalRemark）模糊匹配 */
    InternalRemark?: string;
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
    creatorUserName?: string | null;
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

/** 重新生成委托编号，返回后端按编号规则生成的新编号 */
export const updateSeaExportCommissionNum = (id: number | string) => {
  return requestClient.put<string>(`${API_PREFIX}/UpdateCommissionNumAsync`, {
    id,
  });
};

export const deleteSeaExport = (id: number | string) => {
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
