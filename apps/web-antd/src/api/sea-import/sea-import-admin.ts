/**
 * 海运进口（SeaImportAdmin）接口层。
 *
 * 与海运出口的关键差异：
 * - 集装箱列表 `orderCtns` 位于**海运进口这一层**，不在 `transportOrder` 里，且多出规格/型号 id、净重；
 * - 关联表出参一律是对象（`pol` / `pod` / `originCountry` / `carrier` / `ctnCode` ...），不平铺成 `xxxName`；
 * - 码头是最外层往来单位 `terminalId` + `terminal` 对象（行业类别含「码头」，字母 t / 20）；
 * - 界面上的「到港日期」对应 `transportOrder.etd`；`eta` / `atd` / `goodsCompleteTime` 进口不使用。
 */
import type { UserAttribute } from '#/api/system/user-admin';
import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';

import { requestClient } from '#/api/request';

export namespace SeaImportAdminApi {
  /** 长整型主键：雪花 id 到前端是字符串，禁止 Number() 转换 */
  export type LongId = number | string;

  export interface OrganizationUnitSimpleDto {
    id: LongId;
    name?: null | string;
    localCurrencyId?: LongId | null;
    localCurrencyCode?: null | string;
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  /** 往来单位简易对象（委托单位 / 车队 / 报关行 / 仓库 / 保险 / 收发通） */
  export interface ClientSimpleDto {
    id: string;
    /** 简称 */
    name?: null | string;
    fullName?: null | string;
    /** 该单位默认地址 */
    address?: null | string;
  }

  export interface CarrierSimpleDto {
    id: LongId;
    cnName?: null | string;
    /** 中文简称，列表列与分组名用它 */
    cnShortName?: null | string;
    enName?: null | string;
    /** 英文简称 */
    code?: null | string;
    ediCode?: null | string;
  }

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
   * 港口简易对象。
   * 海运进口的**航线与国家没有独立字段**，只挂在起运港下面：
   * 航线读 `pol.lane.laneName`，国家读 `pol.country.countryName`。
   */
  export interface PortSimpleDto {
    id: LongId;
    /** 港口代码（英文名），界面起运港/目的港列展示的就是它 */
    portName?: null | string;
    cnName?: null | string;
    ediCode?: null | string;
    lane?: LaneSimpleDto | null;
    country?: CountrySimpleDto | null;
  }

  export interface CtnCodeSimpleDto {
    id: LongId;
    /** 箱型表现形式，如 20GP */
    ctnName?: null | string;
    /** 柜型：0 普柜，1 特种柜 */
    cabinetType?: 0 | 1;
    ctnSize?: null | string;
    ctnType?: null | string;
    teu?: number;
  }

  export interface CodePackageSimpleDto {
    id: LongId;
    name?: null | string;
    ediCode?: null | string;
  }

  /** 货源地简易对象 */
  export interface CodeSourceSimpleDto {
    id: LongId;
    code?: null | string;
    cnName?: null | string;
    enName?: null | string;
  }

  /** 运输条款简易对象 */
  export interface CodeServiceSimpleDto {
    id: LongId;
    cnName?: null | string;
    enName?: null | string;
    ediCode?: null | string;
  }

  export interface CodeGoodsSimpleDto {
    id: LongId;
    code?: null | string;
    name?: null | string;
    enName?: null | string;
    hsCode?: null | string;
  }

  /** 品名规格简易对象（集装箱行，进口专属） */
  export interface CodeGoodsSpecSimpleDto {
    id: string;
    codeGoodsId?: LongId;
    name?: null | string;
    sortId?: number;
  }

  /** 品名型号简易对象（集装箱行，进口专属） */
  export interface CodeGoodsModelSimpleDto {
    id: string;
    codeGoodsId?: LongId;
    name?: null | string;
    sortId?: number;
  }

  /** 集装箱新增入参（位于海运进口这一层的 orderCtns） */
  export interface OrderCtnAddDto {
    /** 箱型id，必填且必须 > 0 */
    ctnCodeId?: LongId;
    /** 箱号，32 */
    ctnNo?: string;
    sealNo?: string;
    pkgs?: number;
    codePackageId?: LongId;
    grossWeight?: number;
    tareWeight?: number;
    /** 净重（进口专属）：由用户手填，不按毛重/皮重自动计算，后端只存 */
    netWeight?: number;
    overLength?: number;
    overWidth?: number;
    overHeight?: number;
    volume?: number;
    codeGoodsId?: LongId;
    /**
     * 规格 id（进口专属）。必须属于本行 `codeGoodsId` 下品名；
     * 切换品名时前端必须清空，否则后端拦下。
     */
    codeGoodsSpecId?: null | string;
    /**
     * 型号 id（进口专属）。必须属于本行 `codeGoodsId` 下品名；
     * 切换品名时前端必须清空，否则后端拦下。
     */
    codeGoodsModelId?: null | string;
    bookingNo?: string;
    remark?: string;
  }

  /** 集装箱编辑入参：带 id 表示更新，不带表示新增 */
  export interface OrderCtnEditDto extends OrderCtnAddDto {
    id?: LongId;
  }

  /** 集装箱出参：关联表以对象返回 */
  export interface OrderCtnDto extends OrderCtnEditDto {
    transportOrderId?: string;
    ctnCode?: CtnCodeSimpleDto | null;
    codePackage?: CodePackageSimpleDto | null;
    codeGoods?: CodeGoodsSimpleDto | null;
    codeGoodsSpec?: CodeGoodsSpecSimpleDto | null;
    codeGoodsModel?: CodeGoodsModelSimpleDto | null;
  }

  export interface OrderCodeGoodsAddDto {
    id?: LongId;
    /** 商品（品名）id，必填且必须 > 0 */
    codeGoodsId?: LongId;
  }

  export interface OrderCodeGoodsDto extends OrderCodeGoodsAddDto {
    transportOrderId?: string;
    /**
     * 业务主表商品子表仍可能平铺 name/hsCode（与出口同结构）；
     * 亦可能带 codeGoods 对象，读取时两者都要兜住。
     */
    codeGoodsName?: null | string;
    codeGoodsHSCode?: null | string;
    codeGoods?: CodeGoodsSimpleDto | null;
    /** 该商品关联箱子的 TEU 合计；列表接口恒为 0 */
    teu?: number;
  }

  export interface OrderUserAddDto {
    id?: LongId;
    userId?: number;
    /** 一条记录只放一个属性；16 是销售，每票有且只有一个 */
    userAttribute?: UserAttribute;
    sortId?: number;
    remark?: string;
  }

  export interface OrderUserDto extends OrderUserAddDto {
    transportOrderId?: string;
    userNickName?: null | string;
  }

  /** 费用代码简易对象 */
  export interface FeeCodeSimpleDto {
    id?: LongId;
    code?: null | string;
    cnName?: null | string;
    enName?: null | string;
  }

  /** 币别简易对象 */
  export interface CurrencySimpleDto {
    id?: LongId;
    code?: null | string;
    cnName?: null | string;
    enName?: null | string;
  }

  /** 费用（只读概览，字段口径见接口文档 3.11） */
  export interface OrderFeeDto {
    id: string;
    transportOrderId?: string;
    changeOrderId?: null | string;
    paySide?: number;
    feeStatus?: number;
    settlementStatus?: number;
    invoiceStatus?: number;
    feeCodeId?: LongId;
    /** 文档口径平铺名；对象化后兼容 feeCode.cnName */
    feeCodeName?: null | string;
    feeCode?: FeeCodeSimpleDto | null;
    industryCategory?: null | number;
    settlementId?: null | string;
    settlementName?: null | string;
    settlement?: ClientSimpleDto | null;
    statementId?: null | string;
    currencyId?: LongId;
    currencyName?: null | string;
    currency?: CurrencySimpleDto | null;
    exchangeRate?: number;
    unitPrice?: number;
    noTaxUnitPrice?: number;
    amount?: number;
    noTaxAmount?: number;
    unit?: null | string;
    quantity?: number;
    taxRate?: number;
    invoicedAmount?: number;
    orderInvoiceAmount?: number;
    /** 含税金额 − 已开票金额，超额开票时为负 */
    unInvoicedAmount?: number;
    settledAmount?: number;
    invoiceBlocked?: boolean;
    isConfidential?: boolean;
    dataEntryMethod?: number;
    accountDate?: null | string;
    remark?: null | string;
    creatorUserId?: null | number;
    creatorUserName?: null | string;

    /** 组合费用状态（计算字段，非数据库列） */
    combinedFeeStatus?: number;
  }

  /** 委托单位联系人简易对象 */
  export interface ClientContactSimpleDto {
    id: LongId;
    name?: null | string;
    mobile?: null | string;
    email?: null | string;
    tel?: null | string;
    position?: null | string;
    weChat?: null | string;
  }

  /** 业务主表新增入参（海运进口只用得到的字段） */
  export interface TransportOrderAddDto {
    orgId?: LongId;
    /** 委托编号，32；不传由后端按规则生成 */
    commissionNum?: string;
    codeSourceId?: LongId;
    codeServiceId?: LongId;
    isBusinessLocking?: boolean;
    mblNum?: string;
    bookingNum?: string;
    contractNum?: string;
    internalRemark?: string;
    remark?: string;
    marks?: string;
    goodsDes?: string;
    pkgs?: number;
    codePackageId?: LongId;
    kgs?: number;
    cbm?: number;
    cargoId?: number;
    /** 界面显示为「到港日期」，保存时截断到日期部分 */
    etd?: string;
    clientId: string;
    /** 须属于 ClientId 下的客户联系人 */
    clientContactId?: LongId | null;
    teamId?: string;
    custBrokerId?: string;
    warehouseId?: string;
    insuranceId?: string;
    consigneeId?: string;
    consigneeContent?: string;
    shipperId?: string;
    shipperContent?: string;
    notifierId?: string;
    notifierContent?: string;
    dgLevel?: string;
    dgNo?: string;
    dgPageNo?: string;
    dgLabel?: string;
    dgPackingCategory?: string;
    dgContact?: string;
    dgTel?: string;
    dgNetWeight?: string;
    dgFlashPoint?: string;
    dgPackingNo?: string;
    dgMarinePollution?: boolean;
    reeferTemperature?: string;
    reeferVentilation?: string;
    reeferHumidity?: string;
    reeferMinTemperature?: string;
    reeferMaxTemperature?: string;
    reeferTemperatureUnit?: number;
    reeferVentOpen?: boolean;
    sortId?: number;
    orderCodeGoodss?: OrderCodeGoodsAddDto[];
    /** 必填，且 userAttribute = 16（销售）的记录必须恰好 1 条 */
    orderUsers?: OrderUserAddDto[];
  }

  export interface TransportOrderEditDto extends TransportOrderAddDto {
    id?: string;
  }

  export interface TransportOrderDto {
    id: string;
    /** 恒为 1 海运进口 */
    bizType?: number;
    /** 0 手动录入、2 复制 */
    inputType?: number;
    orgId?: LongId | null;
    commissionNum?: null | string;
    /** 后端计算，界面只读 */
    accountDate?: null | string;
    /** 后端计算，界面只读 */
    settlementDate?: null | string;
    codeSourceId?: LongId | null;
    /** 文档口径平铺名；对象化后兼容 codeSource.cnName */
    codeSourceName?: null | string;
    codeSource?: CodeSourceSimpleDto | null;
    codeServiceId?: LongId | null;
    codeServiceName?: null | string;
    codeService?: CodeServiceSimpleDto | null;
    isBusinessLocking?: boolean;
    isUnfinished?: boolean;
    mblNum?: null | string;
    bookingNum?: null | string;
    contractNum?: null | string;
    internalRemark?: null | string;
    remark?: null | string;
    marks?: null | string;
    goodsDes?: null | string;
    pkgs?: null | number;
    /** 件数大写；列表接口恒为 null */
    upperPKGS?: null | string;
    codePackageId?: LongId | null;
    codePackageName?: null | string;
    codePackage?: CodePackageSimpleDto | null;
    kgs?: null | number;
    cbm?: null | number;
    cargoId?: number;
    /** 到港日期 */
    etd?: null | string;
    clientId: string;
    client?: ClientSimpleDto | null;
    clientContactId?: LongId | null;
    clientContact?: ClientContactSimpleDto | null;
    teamId?: null | string;
    team?: ClientSimpleDto | null;
    custBrokerId?: null | string;
    custBroker?: ClientSimpleDto | null;
    warehouseId?: null | string;
    warehouse?: ClientSimpleDto | null;
    insuranceId?: null | string;
    insurance?: ClientSimpleDto | null;
    consigneeId?: null | string;
    consignee?: ClientSimpleDto | null;
    consigneeContent?: null | string;
    shipperId?: null | string;
    shipper?: ClientSimpleDto | null;
    shipperContent?: null | string;
    notifierId?: null | string;
    notifier?: ClientSimpleDto | null;
    notifierContent?: null | string;
    dgLevel?: null | string;
    dgNo?: null | string;
    dgPageNo?: null | string;
    dgLabel?: null | string;
    dgPackingCategory?: null | string;
    dgContact?: null | string;
    dgTel?: null | string;
    dgNetWeight?: null | string;
    dgFlashPoint?: null | string;
    dgPackingNo?: null | string;
    dgMarinePollution?: boolean | null;
    reeferTemperature?: null | string;
    reeferVentilation?: null | string;
    reeferHumidity?: null | string;
    reeferMinTemperature?: null | string;
    reeferMaxTemperature?: null | string;
    reeferTemperatureUnit?: null | number;
    reeferVentOpen?: boolean | null;
    feeLocked?: boolean;
    feeLockedUserId?: null | number;
    feeLockedTime?: null | string;
    feeUnLockedUserId?: null | number;
    feeUnLockedTime?: null | string;
    sortId?: number;
    orderCodeGoodss?: OrderCodeGoodsDto[];
    orderUsers?: OrderUserDto[];
    orderFees?: OrderFeeDto[];
    /** 箱型箱量合计，形如 `20GP*2 40HQ*1` */
    totalCtn?: null | string;
    teu?: number;
    unsolvedQuestionCount?: number;
    creationTime?: null | string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
  }

  export interface AttachmentDtlTypeSimpleDto {
    id: number;
    name?: null | string;
    sortId?: number;
  }

  export interface AttachmentItemForItemInputDto {
    /** 附件 id（文件上传接口返回），≤ 0 的项被静默跳过 */
    attachmentId: number;
    attachmentDtlTypeId?: null | number;
    clientVisible?: boolean;
    displayOrder?: number;
    itemId?: null | string;
    url?: null | string;
    id?: null | number;
  }

  export interface AttachmentItemDto extends AttachmentItemForItemInputDto {
    moduleTypeId?: null | string;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    isFirstShow?: boolean;
    mediaType?: number;
    friendlyFileName?: null | string;
    fileLength?: null | number;
    creationTime?: null | string;
    creatorUserId?: null | number;
    creatorUserName?: null | string;
  }

  export interface AttachmentGroupDto {
    attachmentDtlTypeId?: null | number;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    items?: AttachmentItemDto[] | null;
  }

  /** 海运进口层新增入参 */
  export interface SeaImportAddDto {
    /** 所属组织：类型可空但业务上必填，必须是本票销售的直属组织 */
    orgId?: LongId;
    vessel?: string;
    innerVoyno?: string;
    carrierId?: LongId;
    polId?: LongId;
    polRemark?: string;
    podId?: LongId;
    podRemark?: string;
    /** 客户编号，32；与委托单位无联动 */
    clientNum?: string;
    /** 码头：往来单位 id，下拉取行业类别含「码头」（字母 t）的客户 */
    terminalId?: string;
    /** 联运单号，32；复制时按一票一号清空 */
    throughBillNum?: string;
    /** 分单号，32；复制时按一票一号清空 */
    hblNum?: string;
    /**
     * 贸易方式：枚举中心 `TradeMode`，后端只存整数、不校验、不参与逻辑。
     */
    tradeMode?: number;
    invoiceNum?: string;
    batchNum?: string;
    /** 原产国：整票只有一个 */
    originCountryId?: LongId;
    /** 净重合计：前端算，后端只存 */
    totalNetWeight?: number;
    exchangeBillDate?: string;
    pickUpDate?: string;
    customsDeclareDate?: string;
    /** 转站日期：前端按「到港日期 + 6 天」带出 */
    transferStationDate?: string;
    freeDays?: number;
    /** 箱使日期：前端按「到港日期 + 免箱期 − 1 天」带出 */
    ctnUseDate?: string;
    sortId?: number;
    transportOrder?: TransportOrderAddDto;
    /** 集装箱列表放在这一层，不放 transportOrder 里 */
    orderCtns?: OrderCtnAddDto[];
    attachmentGroup?: AttachmentGroupDto[];
  }

  export interface SeaImportEditDto extends Omit<
    SeaImportAddDto,
    'orderCtns' | 'transportOrder'
  > {
    id: string;
    transportOrder?: TransportOrderEditDto;
    orderCtns?: OrderCtnEditDto[];
  }

  export interface SeaImportDto {
    id: string;
    /**
     * 当前登录用户对本票是否可编辑（只读，挂在票根上）。
     * `true` 才能改 / 删 / 重新生成委托编号；缺字段按 `false`。
     */
    isEditable?: boolean;
    userId?: number;
    orgId?: LongId | null;
    orgs?: OrganizationUnitSimpleDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: LongId | null;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    vessel?: null | string;
    innerVoyno?: null | string;
    carrierId?: LongId | null;
    carrier?: CarrierSimpleDto | null;
    carrierLogo?: AttachmentItemDto | null;
    polId?: LongId | null;
    /** 起运港；航线读 pol.lane，国家读 pol.country */
    pol?: PortSimpleDto | null;
    polRemark?: null | string;
    podId?: LongId | null;
    pod?: PortSimpleDto | null;
    podRemark?: null | string;
    clientNum?: null | string;
    terminalId?: null | string;
    /** 码头往来单位对象；未选时 null */
    terminal?: ClientSimpleDto | null;
    throughBillNum?: null | string;
    hblNum?: null | string;
    tradeMode?: null | number;
    invoiceNum?: null | string;
    batchNum?: null | string;
    originCountryId?: LongId | null;
    originCountry?: CountrySimpleDto | null;
    totalNetWeight?: null | number;
    exchangeBillDate?: null | string;
    pickUpDate?: null | string;
    customsDeclareDate?: null | string;
    transferStationDate?: null | string;
    freeDays?: null | number;
    ctnUseDate?: null | string;
    sortId?: number;
    creatorUserNickName?: null | string;
    /** 应付费用状态最小值；无应付费用时 null */
    feeStatusPay?: null | number;
    /** 应收费用状态最小值；无应收费用时 null */
    feeStatusReceive?: null | number;
    /** 应付方向组合费用状态 */
    payFeeStatus?: null | number;
    /** 应收方向组合费用状态 */
    receiveFeeStatus?: null | number;
    /** 是否已发起集装箱运踪订阅 */
    isFeituoSubscribed?: boolean;
    /** 运踪订阅是否成功 */
    isFeituoSubscribeSuccess?: boolean;
    /** 运踪摘要（列表 + 详情）；未订阅时为 null */
    feituoTracking?: FeituoTrackingAdminApi.ContainerTrackingSummaryDto | null;
    /** 运踪完整跟踪数据；仅详情，列表恒为 null */
    feituoTrackingDetail?: FeituoTrackingAdminApi.ContainerDataDto | null;
    /** 异常预警明细（按收到时间倒序）；仅详情，列表恒为 null */
    feituoTrackingWarnings?:
      | FeituoTrackingAdminApi.ContainerTrackingWarningDto[]
      | null;
    orderCtns?: OrderCtnDto[];
    /** 列表接口恒为 null */
    attachmentGroup?: AttachmentGroupDto[] | null;
    transportOrder?: TransportOrderDto;
    creationTime?: null | string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
  }

  export interface PagedListOfSeaImportDto {
    items: SeaImportDto[];
    totalCount: number;
    skipCount?: number;
    maxResultCount?: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 分组字段：3~7 沿用既有语义值，12~14 为进口新增维度 */
  export enum SeaImportGroupField {
    Client = 3,
    Carrier = 4,
    POL = 5,
    POD = 6,
    Vessel = 7,
    Warehouse = 12,
    Team = 13,
    OriginCountry = 14,
  }

  export interface SeaImportGroupDto {
    /** 分组值；该字段为空的那一组为 null */
    id: null | number | string;
    name: null | string;
    count: number;
    /** 仅船公司分组可能有值 */
    logo?: AttachmentItemDto | null;
  }

  export interface GetPagedListParams {
    PageIndex?: number;
    PageSize?: number;
    Sorting?: string;

    /** 模糊匹配船名/航次/发票号/批次号/外部备注/主提单号/合同号/委托编号 */
    Keyword?: string;
    /** 按所属组织筛，自动包含全部下级组织 */
    OrgId?: number;

    // ---- 海运进口层 ----
    Vessel?: string;
    VesselEmpty?: boolean;
    InnerVoyno?: string;
    CarrierId?: LongId;
    CarrierIdEmpty?: boolean;
    POLId?: LongId;
    POLIdEmpty?: boolean;
    POLRemark?: string;
    PODId?: LongId;
    PODIdEmpty?: boolean;
    PODRemark?: string;
    ClientNum?: string;
    TerminalId?: string;
    TerminalIdEmpty?: boolean;
    ThroughBillNum?: string;
    HblNum?: string;
    /** 贸易方式：筛选项来自枚举中心 `TradeMode` */
    TradeMode?: number;
    InvoiceNum?: string;
    BatchNum?: string;
    OriginCountryId?: LongId;
    OriginCountryIdEmpty?: boolean;
    TotalNetWeightStart?: number;
    TotalNetWeightEnd?: number;
    ExchangeBillDateStart?: string;
    ExchangeBillDateEnd?: string;
    PickUpDateStart?: string;
    PickUpDateEnd?: string;
    CustomsDeclareDateStart?: string;
    CustomsDeclareDateEnd?: string;
    TransferStationDateStart?: string;
    TransferStationDateEnd?: string;
    FreeDaysStart?: number;
    FreeDaysEnd?: number;
    CtnUseDateStart?: string;
    CtnUseDateEnd?: string;
    CreationTimeStart?: string;
    CreationTimeEnd?: string;

    // ---- 业务主表层 ----
    CommissionNum?: string;
    AccountDateStart?: string;
    AccountDateEnd?: string;
    SettlementDateStart?: string;
    SettlementDateEnd?: string;
    CodeSourceId?: LongId;
    CodeServiceId?: LongId;
    IsBusinessLocking?: boolean;
    IsUnfinished?: boolean;
    MblNum?: string;
    BookingNum?: string;
    ContractNum?: string;
    InternalRemark?: string;
    CargoId?: number;
    Marks?: string;
    CodePackageId?: LongId;
    GoodsDes?: string;
    ClientId?: string;
    TeamId?: string;
    CustBrokerId?: string;
    WarehouseId?: string;
    InsuranceId?: string;
    ConsigneeId?: string;
    ConsigneeContent?: string;
    ShipperId?: string;
    ShipperContent?: string;
    NotifierId?: string;
    NotifierContent?: string;
    /** 到港日期区间 */
    ETDStart?: string;
    ETDEnd?: string;
    FeeLocked?: boolean;

    // ---- 关联人员与集装箱 ----
    SaleId?: number;
    OperationId?: number;
    DocumentationId?: number;
    BusinessId?: number;
    CustomerServiceId?: number;
    CtnCodeId?: LongId;
    CtnNo?: string;
  }

  export interface GetGroupedListParams extends GetPagedListParams {
    GroupField: number;
  }

  export interface SeaImportCopyDto {
    id: string;
    /** 是否一并复制费用（仅非改单费用，并重置为录入初始状态） */
    copyOrderFees: boolean;
  }

  export interface GetDetailParams {
    Id: string;
    /** true 时额外返回公司打印信息 */
    IsPrint?: boolean;
  }

  export interface SeaImportAttachmentsAddDto {
    id: string;
    attachments?: AttachmentItemForItemInputDto[] | null;
  }

  export interface SeaImportAttachmentsDeleteDto {
    id: string;
    /** 传的是附件 id（attachmentId），不是附件关联记录 id */
    attachmentIds?: null | number[];
  }
}

const API_PREFIX = '/services/app/SeaImportAdmin';

export const getSeaImportPagedList = (
  params: SeaImportAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeaImportAdminApi.PagedListOfSeaImportDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getSeaImportGroupedList = (
  params: SeaImportAdminApi.GetGroupedListParams,
) => {
  return requestClient.get<SeaImportAdminApi.SeaImportGroupDto[]>(
    `${API_PREFIX}/GetGroupedListAsync`,
    { params },
  );
};

export const getSeaImportDetail = (id: string, isPrint?: boolean) => {
  const params: SeaImportAdminApi.GetDetailParams = { Id: String(id) };
  if (isPrint) {
    params.IsPrint = true;
  }
  return requestClient.get<SeaImportAdminApi.SeaImportDto>(
    `${API_PREFIX}/DetailAsync`,
    { params },
  );
};

export const addSeaImport = (data: SeaImportAdminApi.SeaImportAddDto) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

export const editSeaImport = (data: SeaImportAdminApi.SeaImportEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const copySeaImport = (data: SeaImportAdminApi.SeaImportCopyDto) => {
  return requestClient.post<string>(`${API_PREFIX}/CopyAsync`, data);
};

/** 删除：参数在请求体里，必须用 { data } 传 */
export const deleteSeaImport = (id: string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id: String(id) },
  });
};

/** 重新生成委托编号，返回新编号 */
export const updateSeaImportCommissionNum = (id: string) => {
  return requestClient.put<string>(`${API_PREFIX}/UpdateCommissionNumAsync`, {
    id: String(id),
  });
};

export const getSeaImportAttachments = (id: string) => {
  return requestClient.get<SeaImportAdminApi.AttachmentGroupDto[]>(
    `${API_PREFIX}/GetAttachmentsAsync`,
    { params: { Id: String(id) } },
  );
};

export const addSeaImportAttachments = (
  data: SeaImportAdminApi.SeaImportAttachmentsAddDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/AddAttachmentsAsync`, data);
};

export const deleteSeaImportAttachments = (
  data: SeaImportAdminApi.SeaImportAttachmentsDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAttachmentsAsync`, {
    data,
  });
};
