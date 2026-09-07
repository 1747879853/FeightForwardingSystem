import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/InputInvoiceAdmin';

/**
 * 进项发票（开给我们购方的票）接口。
 *
 * - 票由后台定时从开票接口发票池落入本地，也可按公司手动拉取；
 * - 没有新增/编辑/删除票面，前端只有「列表 / 分组 / 详情 / 手动拉取」四类操作；
 * - 用户只能看到数据权限覆盖到的公司下的票，`orgId` 存的是公司 id。
 *
 * 枚举 JSON 一律为数字（2026-09-07 起由字符串改为枚举）。
 */
export namespace InputInvoiceAdminApi {
  // ==================== 枚举 ====================

  /** 发票种类。码值是本地 int；对方发票池用字母（p/pc/bs 等），后端拉取时互转 */
  export enum InputInvoiceLine {
    普通发票电子 = 1,
    普通发票纸质 = 2,
    专用发票纸质 = 3,
    专用发票电子 = 4,
    收购发票电子 = 5,
    收购发票纸质 = 6,
    普通发票卷式 = 7,
    增值税电子通行费发票 = 8,
    机动车销售统一发票 = 9,
    二手车发票 = 10,
    电子发票增值税专用发票 = 11,
    电子发票增值税普通发票 = 12,
    全电纸质发票增值税专用发票 = 13,
    全电纸质发票普通发票 = 14,
    数电票航空 = 15,
    数电铁路票 = 16,
    数电机动车发票电子 = 17,
    数电机动车发票纸质 = 18,
    数电二手车发票电子 = 19,
    数电二手车发票纸质 = 20,
  }

  /** 发票状态。数字与发票池 invoiceStatus 一致 */
  export enum InputInvoiceStatus {
    正常 = 1,
    红冲 = 2,
    作废 = 3,
    失控 = 4,
    异常 = 5,
    认证异常 = 6,
    红字待确认 = 7,
    已部分冲红 = 8,
    已全部冲红 = 9,
  }

  /** 精确等级。0 不精确(没有明细) 1 精确(含明细) */
  export enum InputInvoiceLevel {
    不精确 = 0,
    精确 = 1,
  }

  /** 蓝/红类型。不是销项票种 p/c/s */
  export enum InputInvoiceType {
    蓝票 = 1,
    红票 = 2,
  }

  /** 特定业务类型 */
  export enum InputInvoiceSpecialType {
    成品油发票 = 1,
    稀土发票 = 2,
    机动车 = 3,
    货物运输服务发票 = 4,
    不动产销售服务发票 = 5,
    不动产经营租赁服务 = 6,
    代收车船税 = 7,
    通行费 = 8,
    旅客运输服务发票 = 9,
    医疗服务住院发票 = 10,
    医疗服务门诊发票 = 11,
    自产农产品销售发票 = 12,
    拖拉机和联合收割机发票 = 13,
    二手车 = 15,
    农产品收购发票 = 16,
    光伏收购发票 = 17,
    卷烟发票 = 18,
    出口发票 = 19,
    农产品 = 20,
    铁路电子客票 = 21,
    航空运输电子客票行程单 = 22,
    建安发票 = 31,
    房地产销售发票 = 32,
    建筑服务发票 = 103,
  }

  /** 发票风险等级（仅详情返回） */
  export enum InputInvoiceManagementStatus {
    正常 = 0,
    异常凭证 = 1,
    疑点发票 = 2,
  }

  /** 计算抵扣种类（仅详情返回） */
  export enum InputInvoiceGeneralType {
    农产品 = 1,
    税控类 = 2,
    国内旅客运输服务 = 3,
    其他 = 99,
  }

  /** 电子凭证来源（仅详情返回） */
  export enum InputInvoiceVoucherSource {
    浙里办票 = 1,
    税局下载 = 2,
    中航信 = 3,
    用户采集 = 5,
  }

  /** 查验状态。新字段 checkedInvoiceStatusNew 只用 0/4/5/6/7/8 */
  export enum InputInvoiceCheckedStatus {
    未查验 = 0,
    正常 = 1,
    冲红 = 2,
    被作废 = 3,
    缺少查验字段 = 4,
    查验异常 = 5,
    查验失败 = 6,
    查无此票 = 7,
    查验成功 = 8,
  }

  /** 发票池列表查询用的查验筛选。不是票面查验状态 */
  export enum InputInvoicePoolCheckedFilter {
    未查验 = 0,
    已查验 = 1,
  }

  /** 报销状态 */
  export enum InputInvoiceReimbursementStatus {
    未报销 = 1,
    已报销 = 2,
  }

  /** 签收状态 */
  export enum InputInvoiceSignStatus {
    未签收 = 0,
    已签收 = 1,
  }

  /** 税局入账状态（对方补零成 01，本地为 1） */
  export enum InputInvoiceEnterAccountStatus {
    未入账 = 1,
    已入账企业所得税税前扣除 = 2,
    已入账企业所得税不扣除 = 3,
    撤销入账 = 6,
  }

  /** 入账中处理状态（仅详情返回） */
  export enum InputInvoiceEnterAccountDealStatus {
    税前扣除中 = 1,
    不扣除中 = 2,
    入账撤销中 = 3,
  }

  /** 国内国际标识（仅详情返回，数航空才有值） */
  export enum InputInvoiceInternationalSign {
    国内 = 0,
    国际 = 1,
  }

  /** 商品零税率标识（明细行） */
  export enum InputInvoiceZeroTaxRateFlag {
    非零税率 = 0,
    免税 = 1,
    不征税 = 2,
    普通零税率 = 3,
  }

  /** 发票行性质（明细行） */
  export enum InputInvoiceLineProperty {
    正常行 = 0,
    折扣行 = 1,
    被折扣行 = 2,
    清单红票 = 6,
  }

  /** 优惠政策标识（明细行）。纸质票 0/1；数电票 1~18 */
  export enum InputInvoiceFavouredPolicy {
    不使用 = 0,
    简易征收 = 1,
    稀土产品 = 2,
    免税 = 3,
    不征税 = 4,
    先征后退 = 5,
    先征后退6 = 6,
    先征后退7 = 7,
    按百分之三简易征收 = 8,
    按百分之五简易征收 = 9,
    按百分之五简易征收减按一点五计征 = 10,
    即征即退11 = 11,
    即征即退12 = 12,
    即征即退13 = 13,
    即征即退14 = 14,
    即征即退15 = 15,
    即征即退16 = 16,
    即征即退17 = 17,
    即征即退18 = 18,
  }

  /** 含税标识（明细行） */
  export enum InputInvoiceIncludeTax {
    不含税 = 0,
    含税 = 1,
  }

  /** 分组字段。与海空进出口的分组维度不共用，从 1 独立起排 */
  export enum InputInvoiceGroupField {
    /** 发票类型(蓝票/红票) */
    InvoiceType = 1,
    /** 购方名称 */
    PayerName = 2,
    /** 销方名称(销售方抬头) */
    SellerHeader = 3,
  }

  /** 付费申请状态（关联展示用） */
  export enum PaymentApplicationStatus {
    录入 = 0,
    审核中 = 1,
    驳回 = 2,
    通过 = 3,
    部分结算 = 4,
    结算完毕 = 5,
  }

  /** 发票流程（关联展示用） */
  export enum InvoiceProcess {
    先票后付 = 0,
    先付后票 = 1,
    不开票 = 2,
  }

  // ==================== 共用简要对象 ====================

  /** 所属公司（CompanySimpleDto，无公司时为空） */
  export interface CompanySimpleDto {
    id: number;
    code?: string;
    displayName?: string;
    shortName?: string;
    enName?: string;
    isCompany?: boolean;
    localCurrencyId?: null | number;
    unifiedSocialCreditCode?: string;
  }

  /** 组织串元素（OrganizationUnitSimpleDto，顶→底） */
  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    isCompany?: boolean;
    localCurrencyId?: null | number;
    localCurrencyCode?: null | string;
  }

  /** 版式文件附件（AttachmentItemDto，开票完成后才有值） */
  export interface AttachmentItemDto {
    id: number;
    attachmentId: number;
    itemId?: string;
    /** 固定 160120 */
    moduleTypeId?: string;
    /** 客户是否可见，进项固定 false */
    clientVisible?: boolean;
    isFirstShow?: boolean;
    displayOrder?: number;
    /** 本系统文件下载地址 */
    url: string;
    /** 1 图片 5 文档 */
    mediaType?: number;
    /** 显示名，如 {发票号}.ofd */
    friendlyFileName?: string;
    fileLength?: null | number;
    creationTime?: null | string;
    creatorUserId?: null | number;
    creatorUserName?: null | string;
  }

  /** 关联付费申请（PaymentApplicationSimpleDto，已使用时有值） */
  export interface PaymentApplicationSimpleDto {
    id: string;
    applicationNo?: string;
    status?: PaymentApplicationStatus;
    invoiceProcess?: InvoiceProcess;
    submitTime?: null | string;
    endTime?: null | string;
  }

  // ==================== 列表 ====================

  /**
   * 进项发票列表查询参数（InputInvoiceQueryDto，Query 参数）。
   * `pageIndex`/`pageSize` 对列表必填，但分组接口会忽略，故此处设为可选以免分组复用时报错。
   */
  export interface InputInvoiceQueryDto {
    /** 模糊匹配 发票号码/数电号码/发票代码/销方名称/销方税号 */
    keyword?: string;
    invoiceNo?: string;
    invoiceCode?: string;
    elecInvoiceNumber?: string;
    serialNo?: string;
    /** 销售方抬头，即销方名称（模糊）。2026-09-06 由 sellerTaxName 改名 */
    sellerHeader?: string;
    /** 销方名称未填写。与 sellerHeader 互斥 */
    sellerHeaderEmpty?: boolean;
    sellerTaxNo?: string;
    payerName?: string;
    /** 购方名称未填写。与 payerName 互斥 */
    payerNameEmpty?: boolean;
    /** 购方税号（精确） */
    payerTaxNo?: string;
    clerk?: string;
    remark?: string;
    invoiceLine?: InputInvoiceLine;
    invoiceStatus?: InputInvoiceStatus;
    invoiceType?: InputInvoiceType;
    /** 发票类型未填写。与 invoiceType 互斥 */
    invoiceTypeEmpty?: boolean;
    level?: InputInvoiceLevel;
    specialInvoiceType?: InputInvoiceSpecialType;
    checkedInvoiceStatus?: InputInvoiceCheckedStatus;
    reimbursementStatus?: InputInvoiceReimbursementStatus;
    signStatus?: InputInvoiceSignStatus;
    enterAccountStatus?: InputInvoiceEnterAccountStatus;
    invoiceTimeStart?: string;
    invoiceTimeEnd?: string;
    collectionTimeStart?: string;
    collectionTimeEnd?: string;
    poolUpdateTimeStart?: string;
    poolUpdateTimeEnd?: string;
    /** 落入本地时间起（对应出参 creationTime） */
    creationTimeStart?: string;
    creationTimeEnd?: string;
    lastModificationTimeStart?: string;
    lastModificationTimeEnd?: string;
    /** 创建人。系统定时拉取的票没有创建人 */
    creatorUserId?: number;
    lastModifierUserId?: number;
    /** 组织 id。传部门时向上找到所属公司再筛 */
    orgId?: number;
    /** 是否已拉到明细 */
    hasDetail?: boolean;
    totalAmountStart?: number;
    totalAmountEnd?: number;
    exTaxAmountStart?: number;
    exTaxAmountEnd?: number;
    taxAmountStart?: number;
    taxAmountEnd?: number;
    /** 是否包含冲红发票。空=不筛；true=只含冲红；false=不含冲红 */
    includeRedInvoice?: boolean;
    /** 是否已使用（发票号精确匹配付费申请发票） */
    isUsed?: boolean;
    pageIndex?: number;
    pageSize?: number;
    /** 默认 InvoiceTime DESC */
    sorting?: string;
  }

  /** 进项发票列表项（InputInvoiceListDto） */
  export interface InputInvoiceListDto {
    id: string;
    /** 所属人。系统拉取固定为 0 */
    userId: number;
    /** 购方公司组织 id */
    orgId?: null | number;
    creationTime?: string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
    serialNo?: string;
    /** 发票代码。数电为空串 */
    invoiceCode?: string;
    invoiceNo?: string;
    elecInvoiceNumber?: string;
    invoiceTime?: null | string;
    collectionTime?: null | string;
    poolUpdateTime?: null | string;
    invoiceLine?: null | InputInvoiceLine;
    invoiceStatus?: null | InputInvoiceStatus;
    level?: null | InputInvoiceLevel;
    invoiceType?: null | InputInvoiceType;
    specialInvoiceType?: null | InputInvoiceSpecialType;
    totalAmount?: null | number;
    exTaxAmount?: null | number;
    taxAmount?: null | number;
    sellerTaxNo?: string;
    /** 销售方抬头，即销方名称 */
    sellerHeader?: string;
    payerName?: string;
    payerTaxNo?: string;
    clerk?: string;
    remark?: string;
    /** 版式文件地址（外链） */
    pdfUrl?: string;
    /** 发票图片地址（外链） */
    pictureUrl?: string;
    checkedInvoiceStatus?: null | InputInvoiceCheckedStatus;
    reimbursementStatus?: null | InputInvoiceReimbursementStatus;
    signStatus?: null | InputInvoiceSignStatus;
    enterAccountStatus?: null | InputInvoiceEnterAccountStatus;
    /** 是否已拉到明细 */
    hasDetail: boolean;
    creatorUserName?: string;
    lastModifierUserName?: string;
    localCurrencyId?: null | number;
    localCurrencyCode?: null | string;
    company?: CompanySimpleDto | null;
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 版式文件附件。未开完或地址未出时为空数组 */
    attachments?: AttachmentItemDto[];
    /** 是否已使用（发票号已关联付费申请发票为 true） */
    isUsed: boolean;
    /** 关联付费申请。未使用时为空 */
    paymentApplication?: null | PaymentApplicationSimpleDto;
  }

  /** 分页结果（PagedList<T>） */
  export interface PagedList<T> {
    items: T[];
    totalCount: number;
    skipCount?: number;
    maxResultCount?: number;
    currentPage?: number;
    totalPages?: number;
  }

  // ==================== 分组 ====================

  /**
   * 分组统计查询参数（InputInvoiceGroupQueryDto）。
   * = 列表全部入参 + groupField；pageIndex/pageSize/sorting 传了也不生效。
   */
  export interface InputInvoiceGroupQueryDto extends InputInvoiceQueryDto {
    /** 分组字段 1 发票类型 2 购方名称 3 销方名称 */
    groupField: InputInvoiceGroupField;
  }

  /** 分组统计项（InputInvoiceGroupDto，数组，不分页，按 count 倒序） */
  export interface InputInvoiceGroupDto {
    /**
     * 分组值。groupField=1 时为发票类型枚举的 int 字符串（"1"蓝/"2"红）；
     * 2/3 时为名称本身；未填写组为 null。
     */
    id: null | string;
    /** 分组显示名。groupField=1 时为「蓝票」/「红票」；2/3 时同 id；未填写组为 null */
    name: null | string;
    count: number;
  }

  // ==================== 详情 ====================

  /** 商品明细（InputInvoiceItemDto） */
  export interface InputInvoiceItemDto {
    id: string;
    inputInvoiceId: string;
    detailIndex?: null | number;
    itemName?: string;
    itemSpec?: string;
    itemUnit?: string;
    /** 税收分类编码 */
    itemCode?: string;
    itemNum?: null | number;
    /** 单价（含税） */
    itemPrice?: null | number;
    itemTaxFreePrice?: null | number;
    /** 不含税金额 */
    itemAmount?: null | number;
    itemTaxAmount?: null | number;
    /** 含税金额/价税合计 */
    itemTotalAmount?: null | number;
    /** 税率（小数，如 0.06） */
    itemTaxRate?: null | number;
    itemDeductAmount?: null | number;
    zeroTaxRateFlag?: null | InputInvoiceZeroTaxRateFlag;
    zeroTaxRateDesc?: string;
    invoiceLineProperty?: null | InputInvoiceLineProperty;
    favouredPolicyFlag?: null | InputInvoiceFavouredPolicy;
    isIncludeTax?: null | InputInvoiceIncludeTax;
    /** 通行费：通行日期起 */
    transitDateStart?: string;
    transitDateEnd?: string;
  }

  /** 建筑服务（该票种才有值） */
  export interface InputInvoiceBuildingInfoDto {
    detailIndex?: string;
    invoiceId?: string;
    address?: string;
    detailAddress?: string;
    itemName?: string;
    itemCode?: string;
    /** 跨地市标志 0 否 1 是 */
    crossCity?: string;
  }

  /** 货物运输（该票种才有值） */
  export interface InputInvoiceGoodsTransportDto {
    detailIndex?: string;
    invoiceId?: string;
    departure?: string;
    destination?: string;
    transportTool?: string;
    transportBrand?: string;
    itemName?: string;
  }

  /** 不动产销售（该票种才有值） */
  export interface InputInvoiceImmovableSellDto {
    detailIndex?: null | number;
    invoiceId?: string;
    certificate?: string;
    address?: string;
    detailAddress?: string;
    contractNum?: string;
    itemCode?: string;
    approvedAmount?: string;
    transactionAmount?: string;
    crossCity?: null | number;
    unit?: string;
  }

  /** 不动产租赁（该票种才有值） */
  export interface InputInvoiceImmovableRentDto {
    detailIndex?: null | number;
    invoiceId?: string;
    certificate?: string;
    address?: string;
    detailAddress?: string;
    rentStart?: string;
    rentEnd?: string;
    crossCity?: null | number;
    unit?: string;
  }

  /** 旅客运输（该票种才有值） */
  export interface InputInvoiceTravellerTransportDto {
    detailIndex?: string;
    invoiceId?: string;
    traveller?: string;
    cardType?: string;
    cardNo?: string;
    travelDate?: string;
    departure?: string;
    destination?: string;
    vehicleType?: string;
    vehicleLevel?: string;
  }

  /** 铁路电子客票（该票种才有值） */
  export interface InputInvoiceRailwayTicketDto {
    detailIndex?: null | number;
    traveller?: string;
    cardNo?: string;
    departure?: string;
    destination?: string;
    toolsNumber?: string;
    boardingDate?: string;
    departureTime?: string;
    carriage?: string;
    ticketNo?: string;
    airFeatures?: string;
    seatType?: string;
    seat?: string;
    /** 业务类型 1 售 2 退 */
    bizType?: null | number;
  }

  /** 航空票发票明细（该票种才有值，字段均为字符串） */
  export interface InputInvoiceAirInvoiceItemDto {
    detailIndex?: string;
    itemName?: string;
    itemUnit?: string;
    itemPrice?: string;
    itemTaxRate?: string;
    itemNum?: string;
    itemAmount?: string;
    itemTaxAmount?: string;
    itemTotalAmount?: string;
    itemSpec?: string;
    itemCode?: string;
    itemTaxFreePrice?: string;
    zeroTaxRateFlag?: string;
    zeroTaxRateDesc?: string;
    invoiceLineProperty?: string;
    itemDeductAmount?: string;
    favouredPolicyFlag?: string;
  }

  /** 航空票航段（该票种才有值） */
  export interface InputInvoiceAirSegmentDto {
    detailIndex?: string;
    departureStation?: string;
    destinationStation?: string;
    flightSegment?: string;
    carrier?: string;
    flight?: string;
    seatClass?: string;
    carrierDate?: string;
    departureTime?: string;
    fareBasis?: string;
    effectiveDate?: string;
    expirationDate?: string;
    freeBaggageAllowance?: string;
  }

  /**
   * 进项发票详情（InputInvoiceDetailDto）：
   * 在列表行级字段基础上增加票头字段与 9 类嵌套数组（无则为空数组）。
   */
  export interface InputInvoiceDetailDto extends InputInvoiceListDto {
    /** 发票风险等级 */
    managementStatus?: null | InputInvoiceManagementStatus;
    /** 计算抵扣种类 */
    generalType?: null | InputInvoiceGeneralType;
    sellerAddress?: string;
    sellerPhone?: string;
    sellerAccount?: string;
    payerAddress?: string;
    payerPhone?: string;
    payerAccount?: string;
    payee?: string;
    checker?: string;
    cipherText?: string;
    machineCode?: string;
    checkCode?: string;
    backupUrl?: string;
    voucherUrl?: string;
    voucherSource?: null | InputInvoiceVoucherSource;
    xmlUrl?: string;
    /** 查验状态(新) */
    checkedInvoiceStatusNew?: null | InputInvoiceCheckedStatus;
    checkTime?: null | string;
    reimbursementDate?: null | string;
    reimbursementName?: string;
    signTime?: null | string;
    signUserName?: string;
    enterAccountDealStatus?: null | InputInvoiceEnterAccountDealStatus;
    enterAccountTime?: null | string;
    enterAccountFailReason?: string;
    // ---- 机动车/二手车票头 ----
    vehicleType?: string;
    vehicleBrandModel?: string;
    producingArea?: string;
    certificateNo?: string;
    commodityInspectionNo?: string;
    engineNo?: string;
    vin?: string;
    importCertificateNo?: string;
    taxAuthorityCode?: string;
    taxAuthorityName?: string;
    taxPaymentCertificateNo?: string;
    tonnage?: string;
    limitedNumber?: string;
    /** 机动车发票税率 */
    taxRate?: string;
    licensePlateNo?: string;
    vehicleRegisterNo?: string;
    intoVehicleManagementStat?: string;
    auctionCompany?: string;
    auctionCompanyAddress?: string;
    auctionCompanyTaxNo?: string;
    auctionCompanyBankAccount?: string;
    auctionCompanyTel?: string;
    usedCarCompany?: string;
    usedCarCompanyAddress1?: string;
    usedCarCompanyTaxNo?: string;
    usedCarCompanyBankAccount?: string;
    usedCarCompanyTel?: string;
    // ---- 航空票头 ----
    internationalSign?: null | InputInvoiceInternationalSign;
    passengerName?: string;
    valididNum?: string;
    endorsement?: string;
    gpOrderNum?: string;
    fare?: string;
    fuelSurcharge?: string;
    developmentFund?: string;
    otherTaxes?: string;
    insurance?: string;
    ticketNum?: string;
    qrCode?: string;
    promptInformation?: string;
    agentCode?: string;
    issueParty?: string;
    buyerAddressTel?: string;
    buyerBankAccount?: string;
    // ---- 嵌套数组 ----
    items?: InputInvoiceItemDto[];
    buildingInfoItems?: InputInvoiceBuildingInfoDto[];
    goodsTransportItems?: InputInvoiceGoodsTransportDto[];
    immovableSellItems?: InputInvoiceImmovableSellDto[];
    immovableRentItems?: InputInvoiceImmovableRentDto[];
    travellerTransportItems?: InputInvoiceTravellerTransportDto[];
    railwayTicketItems?: InputInvoiceRailwayTicketDto[];
    airInvoiceItems?: InputInvoiceAirInvoiceItemDto[];
    airSegments?: InputInvoiceAirSegmentDto[];
  }

  // ==================== 手动拉取 ====================

  /** 手动拉取入参（InputInvoicePullDto，Body） */
  export interface InputInvoicePullDto {
    /** 所属公司组织 id（必填）。传部门时向上找到所属公司再拉 */
    companyId: number;
    /** 发票号码。有值时按号码查，不再分页 */
    invoiceNo?: string;
    /** 发票代码。数电票不传 */
    invoiceCode?: string;
    elecInvoiceNumber?: string;
    /** 开票时间起。与止必须一起传 */
    invoiceTimeStart?: string;
    invoiceTimeEnd?: string;
    /** 更新时间起。与止必须一起传 */
    updateTimeStart?: string;
    updateTimeEnd?: string;
    sellerHeader?: string;
    sellerTaxNo?: string;
    totalAmount?: number;
    invoiceLine?: InputInvoiceLine;
    invoiceStatus?: InputInvoiceStatus;
    /** 查验筛选 0 未查验 1 已查验。不是票面查验状态 */
    checkedStatus?: InputInvoicePoolCheckedFilter;
    reimbursementStatus?: InputInvoiceReimbursementStatus;
    signStatus?: InputInvoiceSignStatus;
    enterAccountStatus?: InputInvoiceEnterAccountStatus;
  }

  /** 手动拉取结果（InputInvoicePullResultDto） */
  export interface InputInvoicePullResultDto {
    /** 本次写入或更新的张数。池里没有符合条件的票时为 0 */
    count: number;
  }

  // ==================== API 方法 ====================

  /**
   * 进项发票分页列表。
   * @param params 查询参数（pageIndex/pageSize 必填）
   */
  export function getPagedList(params: InputInvoiceQueryDto) {
    return requestClient.get<PagedList<InputInvoiceListDto>>(
      `${API_PREFIX}/GetPagedListAsync`,
      { params },
    );
  }

  /**
   * 进项发票分组统计（数组，不分页，按 count 倒序）。
   * 筛选条件与列表接口完全一致，各分组条数相加 = 当前筛选下列表 totalCount。
   * @param params 列表全部入参 + groupField
   */
  export function getGroupedList(params: InputInvoiceGroupQueryDto) {
    return requestClient.get<InputInvoiceGroupDto[]>(
      `${API_PREFIX}/GetGroupedListAsync`,
      { params },
    );
  }

  /**
   * 进项发票详情。
   * @param id 进项发票主键（Guid）
   */
  export function detail(id: string) {
    return requestClient.get<InputInvoiceDetailDto>(
      `${API_PREFIX}/DetailAsync`,
      { params: { id } },
    );
  }

  /**
   * 手动拉取进项发票：按公司现查发票池并写入/更新本地，返回本次写入或更新张数。
   * 权限 Admin.InputInvoice.Add（列表查看权限不能调）。
   * @param data 拉取参数（companyId 必填）
   */
  export function pull(data: InputInvoicePullDto) {
    return requestClient.post<InputInvoicePullResultDto>(
      `${API_PREFIX}/PullAsync`,
      data,
    );
  }
}
