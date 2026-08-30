/**
 * 空运出口（AirExportAdmin）接口层。
 *
 * 与海运出口/进口的关键差异：
 * - 货物明细 `airExportOrderCtns` 位于**空运出口这一层**，外键挂空运出口 Id，
 *   `transportOrder.orderCtns` 恒为 null（那是海运的集装箱）；
 * - 明细行内单位混用：件数/单件重量/长宽高/单件体积是**单件**值，
 *   体积重与计费重是**整行合计**值，且后端不校验也不重算，全部由前端算好再提交；
 * - 起运地/中转地/目的地是空运港口（机场），出参是对象（`pol` / `pot` / `pod`），
 *   选中回显三字码、备注回填英文名，列表列仍按「三字码/英文名」拼接，不带国家、城市、时区；
 * - 界面上的「起飞日期 / 实际起飞日期 / 预抵日期」分别落在 `transportOrder` 的
 *   `etd` / `atd` / `eta`，空运没有 `flightDate` 之类的字段。
 */
import type { UserAttribute } from '#/api/system/user-admin';
import type { FeituoTrackingAdminApi } from '#/api/tracking/feituo-tracking-admin';
import type { YundangAirAdminApi } from '#/api/yundang/yundang-air-admin';

import { requestClient } from '#/api/request';

export namespace AirExportAdminApi {
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

  /** 往来单位简易对象（订舱代理 / 委托单位 / 车队 / 报关行 / 仓库 / 保险 / 收发通） */
  export interface ClientSimpleDto {
    id: string;
    /** 简称 */
    name?: null | string;
    fullName?: null | string;
    /** 该单位默认地址 */
    address?: null | string;
  }

  /**
   * 空运港口（机场）简易对象。
   * 只有三字码与中英文名称，**不返回国家、城市、ICAO 码、时区**。
   */
  export interface AirPortSimpleDto {
    id: LongId;
    /** 三字码，如 PVG */
    iataCode?: null | string;
    enName?: null | string;
    cnName?: null | string;
  }

  export interface CodePackageSimpleDto {
    id: LongId;
    name?: null | string;
    ediCode?: null | string;
  }

  /** 品名简易对象 */
  export interface CodeGoodsSimpleDto {
    id: LongId;
    code?: null | string;
    name?: null | string;
    enName?: null | string;
    hsCode?: null | string;
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

  /**
   * 货物明细新增入参（位于空运出口这一层的 airExportOrderCtns）。
   *
   * 后端对这张表**完全不做校验**，也不重算派生值，传什么存什么。
   */
  export interface AirExportOrderCtnAddDto {
    /** 件数：本行有多少件 */
    pkgs?: number;
    /** 单件重量（KGS），不是整行合计 */
    kgs?: number;
    /** 单件长（CM） */
    length?: number;
    /** 单件宽（CM） */
    width?: number;
    /** 单件高（CM） */
    height?: number;
    /** 单件体积（CBM）：前端算 长×宽×高÷1000000 */
    cbm?: number;
    /** 整行体积重合计（KGS）：前端算 单件体积×167×件数 */
    volumeWeight?: number;
    /** 整行计费重合计（KGS）：前端算 max(体积重, 单件重量×件数) 后按 0.5kg 向上进位 */
    chargeWeight?: number;
    /** 排序号，出参按升序；插行/拖动排序要整表重排后一起提交 */
    sortId?: number;
  }

  /**
   * 货物明细编辑入参。
   *
   * 主键是**可空 Guid**：传已有 id = 更新该行，不传或 null = 新增行。
   * 新增行不要传全零 Guid，否则会被当成「传了主键」而静默丢失。
   */
  export interface AirExportOrderCtnEditDto extends AirExportOrderCtnAddDto {
    id?: null | string;
  }

  export interface AirExportOrderCtnDto extends AirExportOrderCtnEditDto {
    airExportId?: string;
  }

  export interface OrderCodeGoodsAddDto {
    id?: LongId;
    /** 商品（品名）id，必填且必须 > 0 */
    codeGoodsId?: LongId;
  }

  export interface OrderCodeGoodsDto extends OrderCodeGoodsAddDto {
    transportOrderId?: string;
    /** 品名对象（替代 codeGoodsName / codeGoodsHSCode） */
    codeGoods?: CodeGoodsSimpleDto | null;
    /** 空运恒为 0，界面不展示 */
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
    /** null 表示正常费用，非空表示改单费用 */
    changeOrderId?: null | string;
    /** 0 收 / 1 付 */
    paySide?: number;
    feeStatus?: number;
    settlementStatus?: number;
    invoiceStatus?: number;
    feeCodeId?: LongId;
    /** 费用代码对象（替代 feeCodeName / feeCodeCode） */
    feeCode?: FeeCodeSimpleDto | null;
    industryCategory?: null | number;
    settlementId?: null | string;
    /** 结算对象（替代 settlementName / settlementCode） */
    settlement?: ClientSimpleDto | null;
    statementId?: null | string;
    currencyId?: LongId;
    /** 币别对象（替代 currencyName / currencyCode） */
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

  /** 业务主表新增入参（空运出口用得到的字段） */
  export interface TransportOrderAddDto {
    orgId?: LongId;
    /** 委托编号，32；不传由后端按 AirExport.CommissionNum 规则生成 */
    commissionNum?: string;
    codeSourceId?: LongId;
    codeServiceId?: LongId;
    isBusinessLocking?: boolean;
    /** 主提单号，空运即主运单号，64 */
    mblNum?: string;
    contractNum?: string;
    internalRemark?: string;
    remark?: string;
    marks?: string;
    goodsDes?: string;
    /** 整票件数，与货物明细的件数互不联动 */
    pkgs?: number;
    codePackageId?: LongId;
    /** 整票毛重 KGS，泡比的分子 */
    kgs?: number;
    /** 整票体积 CBM，泡比的分母 */
    cbm?: number;
    cargoId?: number;
    /** 货好时间，保存时截断到日期 */
    goodsCompleteTime?: string;
    /** 起飞日期，保存时截断到日期；驱动会计期间与应结日期 */
    etd?: string;
    /** 实际起飞日期，保存时截断到日期 */
    atd?: string;
    /** 预抵日期，保存时截断到日期 */
    eta?: string;
    clientId: string;
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
    /** 危险品净重是**文本**，与货物明细的重量无关 */
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
    /** 恒为 2 空运出口 */
    bizType?: number;
    /** 0 手动录入、2 复制 */
    inputType?: number;
    orgId?: LongId | null;
    commissionNum?: null | string;
    /** 后端计算，界面只读，恒为某月 1 号 */
    accountDate?: null | string;
    /** 后端计算，界面只读 */
    settlementDate?: null | string;
    codeSourceId?: LongId | null;
    /** 货源地对象（替代 codeSourceName） */
    codeSource?: CodeSourceSimpleDto | null;
    codeServiceId?: LongId | null;
    /** 运输条款对象（替代 codeServiceName） */
    codeService?: CodeServiceSimpleDto | null;
    isBusinessLocking?: boolean;
    isUnfinished?: boolean;
    mblNum?: null | string;
    /** 订舱编号，空运不展示 */
    bookingNum?: null | string;
    contractNum?: null | string;
    internalRemark?: null | string;
    remark?: null | string;
    marks?: null | string;
    goodsDes?: null | string;
    pkgs?: null | number;
    /** 件数大写 + 包装名；列表接口恒为 null */
    upperPKGS?: null | string;
    codePackageId?: LongId | null;
    /** 包装对象（替代 codePackageName） */
    codePackage?: CodePackageSimpleDto | null;
    kgs?: null | number;
    cbm?: null | number;
    cargoId?: number;
    goodsCompleteTime?: null | string;
    /** 起飞日期 */
    etd?: null | string;
    /** 实际起飞日期 */
    atd?: null | string;
    /** 预抵日期 */
    eta?: null | string;
    clientId: string;
    client?: ClientSimpleDto | null;
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
    /** 空运没有集装箱，恒为 null */
    orderCtns?: null;
    /** 空运没有箱型箱量汇总，恒为 null */
    totalCtn?: null | string;
    /** 空运恒为 0 */
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
    creatorUserName?: null | string;
  }

  export interface AttachmentGroupDto {
    attachmentDtlTypeId?: null | number;
    attachmentDtlType?: AttachmentDtlTypeSimpleDto | null;
    items?: AttachmentItemDto[] | null;
  }

  /** 空运出口层新增入参 */
  export interface AirExportAddDto {
    /** 所属组织：类型可空但业务上必填，必须是本票销售的直属组织 */
    orgId?: LongId;
    /** 订舱代理（国内代理），指向往来单位 */
    bookingAgentId?: string;
    /** 航班，64；自由文本无下拉，全空白会被存成 null */
    flightNo?: string;
    /** 起运地（机场）id */
    polId?: LongId;
    polRemark?: string;
    /** 中转地（机场）id，只有一个中转地 */
    potId?: LongId;
    potRemark?: string;
    /** 目的地（机场）id */
    podId?: LongId;
    podRemark?: string;
    /** 泡比：前端算 kgs ÷ cbm，算不出来传 null（不要传 0） */
    bubbleRatio?: null | number;
    /** 报关日期，**原样保存不截断时分秒** */
    customsDeclareDate?: string;
    /** 送仓日期，**原样保存不截断时分秒** */
    deliveryWarehouseDate?: string;
    sortId?: number;
    transportOrder?: TransportOrderAddDto;
    /** 货物明细放在这一层，不放 transportOrder 里 */
    airExportOrderCtns?: AirExportOrderCtnAddDto[];
    attachmentGroup?: AttachmentGroupDto[];
  }

  export interface AirExportEditDto extends Omit<
    AirExportAddDto,
    'airExportOrderCtns' | 'transportOrder'
  > {
    id: string;
    transportOrder?: TransportOrderEditDto;
    airExportOrderCtns?: AirExportOrderCtnEditDto[];
  }

  export interface AirExportDto {
    id: string;
    /**
     * 当前登录用户对本票是否可编辑（只读，挂在票根上）。
     * `true` 才能改 / 删 / 重新生成委托编号；缺字段按 `false`。
     */
    isEditable?: boolean;
    /** 数据所属人 id */
    userId?: number;
    userName?: null | string;
    orgId?: LongId | null;
    orgs?: OrganizationUnitSimpleDto[];
    bookingAgentId?: null | string;
    bookingAgent?: ClientSimpleDto | null;
    flightNo?: null | string;
    polId?: LongId | null;
    pol?: AirPortSimpleDto | null;
    polRemark?: null | string;
    potId?: LongId | null;
    pot?: AirPortSimpleDto | null;
    potRemark?: null | string;
    podId?: LongId | null;
    pod?: AirPortSimpleDto | null;
    podRemark?: null | string;
    bubbleRatio?: null | number;
    customsDeclareDate?: null | string;
    deliveryWarehouseDate?: null | string;
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
    /** 是否已发起过空运运单运踪订阅（存在订阅记录即为 true） */
    isYundangSubscribed?: boolean;
    /** 当前订阅记录是否订阅成功（对应订阅表 isSuccess） */
    isYundangSubscribeSuccess?: boolean;
    /** 运单当前空运节点（最后一个有实际时间的节点；无推送或无实际节点为 null） */
    yundangAirShipmentNode?: null | YundangAirAdminApi.YundangAirShipmentNodeInfoDto;
    /** 是否已发起航空货运运踪订阅（新服务商） */
    isFeituoSubscribed?: boolean;
    /** 运踪订阅是否成功（新服务商） */
    isFeituoSubscribeSuccess?: boolean;
    /** 运踪摘要（列表 + 详情）；未订阅时为 null */
    feituoTracking?: FeituoTrackingAdminApi.AirTrackingSummaryDto | null;
    /** 运踪完整轨迹；仅详情，列表恒为 null */
    feituoTrackingDetail?: FeituoTrackingAdminApi.AirDataDto | null;
    /** 异常预警明细；仅详情，列表恒为 null */
    feituoTrackingWarnings?:
      | FeituoTrackingAdminApi.AirTrackingWarningDto[]
      | null;
    /** 货物明细，按 sortId 升序；无明细时 [] */
    airExportOrderCtns?: AirExportOrderCtnDto[];
    transportOrder?: TransportOrderDto;
    /** 列表接口恒为 null */
    attachmentGroup?: AttachmentGroupDto[] | null;
    creationTime?: null | string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
  }

  export interface PagedListOfAirExportDto {
    items: AirExportDto[];
    totalCount: number;
    skipCount?: number;
    maxResultCount?: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 分组字段：沿用业务主表既有语义值，空运只支持这 9 个 */
  export enum AirExportGroupField {
    Client = 3,
    POL = 5,
    POD = 6,
    Warehouse = 12,
    Team = 13,
    BookingAgent = 15,
    POT = 16,
    Insurance = 17,
    CustBroker = 18,
  }

  export interface AirExportGroupDto {
    /** 分组值；该维度为空的那一组为 null */
    id: null | number | string;
    /** 往来单位取简称；空港取「三字码/中文名」拼接结果 */
    name: null | string;
    count: number;
  }

  export interface GetPagedListParams {
    PageIndex?: number;
    PageSize?: number;
    Sorting?: string;

    /** 模糊匹配航班/外部备注/主提单号/合同号/委托编号 */
    Keyword?: string;
    /** 按所属组织筛，自动包含全部下级组织 */
    OrgId?: number;

    // ---- 空运出口层 ----
    FlightNo?: string;
    FlightNoEmpty?: boolean;
    BookingAgentId?: string;
    BookingAgentIdEmpty?: boolean;
    POLId?: LongId;
    POLIdEmpty?: boolean;
    POLRemark?: string;
    POTId?: LongId;
    POTIdEmpty?: boolean;
    POTRemark?: string;
    PODId?: LongId;
    PODIdEmpty?: boolean;
    PODRemark?: string;
    BubbleRatioStart?: number;
    BubbleRatioEnd?: number;
    /** 报关日期不截断时分秒，止端建议传当天 23:59:59 */
    CustomsDeclareDateStart?: string;
    CustomsDeclareDateEnd?: string;
    /** 送仓日期不截断时分秒，止端建议传当天 23:59:59 */
    DeliveryWarehouseDateStart?: string;
    DeliveryWarehouseDateEnd?: string;
    CreationTimeStart?: string;
    CreationTimeEnd?: string;

    // ---- 业务主表层 ----
    CommissionNum?: string;
    InputType?: number;
    AccountDateStart?: string;
    AccountDateEnd?: string;
    SettlementDateStart?: string;
    SettlementDateEnd?: string;
    CodeSourceId?: LongId;
    CodeServiceId?: LongId;
    IsBusinessLocking?: boolean;
    IsUnfinished?: boolean;
    MblNum?: string;
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
    GoodsCompleteTimeStart?: string;
    GoodsCompleteTimeEnd?: string;
    /** 起飞日期区间 */
    ETDStart?: string;
    ETDEnd?: string;
    /** 实际起飞日期区间 */
    ATDStart?: string;
    ATDEnd?: string;
    /** 预抵日期区间 */
    ETAStart?: string;
    ETAEnd?: string;
    FeeLocked?: boolean;

    // ---- 关联人员与货物明细 ----
    SaleId?: number;
    OperationId?: number;
    DocumentationId?: number;
    BusinessId?: number;
    CustomerServiceId?: number;
    /** 明细区间筛选是「存在」语义，起止两端各自独立判断，可命中不同的行 */
    CtnPKGSStart?: number;
    CtnPKGSEnd?: number;
    CtnKGSStart?: number;
    CtnKGSEnd?: number;
    CtnLengthStart?: number;
    CtnLengthEnd?: number;
    CtnWidthStart?: number;
    CtnWidthEnd?: number;
    CtnHeightStart?: number;
    CtnHeightEnd?: number;
    CtnCBMStart?: number;
    CtnCBMEnd?: number;
    CtnVolumeWeightStart?: number;
    CtnVolumeWeightEnd?: number;
    CtnChargeWeightStart?: number;
    CtnChargeWeightEnd?: number;
  }

  export interface GetGroupedListParams extends GetPagedListParams {
    GroupField: number;
  }

  export interface AirExportCopyDto {
    id: string;
    /** 是否一并复制费用（仅非改单费用，并重置为录入初始状态） */
    copyOrderFees: boolean;
  }

  export interface GetDetailParams {
    Id: string;
    /** true 时额外返回公司打印信息 */
    IsPrint?: boolean;
  }

  export interface AirExportAttachmentsAddDto {
    id: string;
    attachments?: AttachmentItemForItemInputDto[] | null;
  }

  export interface AirExportAttachmentsDeleteDto {
    id: string;
    /** 传的是附件 id（attachmentId），不是附件关联记录 id */
    attachmentIds?: null | number[];
  }
}

const API_PREFIX = '/services/app/AirExportAdmin';

export const getAirExportPagedList = (
  params: AirExportAdminApi.GetPagedListParams,
) => {
  return requestClient.get<AirExportAdminApi.PagedListOfAirExportDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getAirExportGroupedList = (
  params: AirExportAdminApi.GetGroupedListParams,
) => {
  return requestClient.get<AirExportAdminApi.AirExportGroupDto[]>(
    `${API_PREFIX}/GetGroupedListAsync`,
    { params },
  );
};

export const getAirExportDetail = (id: string, isPrint?: boolean) => {
  const params: AirExportAdminApi.GetDetailParams = { Id: String(id) };
  if (isPrint) {
    params.IsPrint = true;
  }
  return requestClient.get<AirExportAdminApi.AirExportDto>(
    `${API_PREFIX}/DetailAsync`,
    { params },
  );
};

export const addAirExport = (data: AirExportAdminApi.AirExportAddDto) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

export const editAirExport = (data: AirExportAdminApi.AirExportEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const copyAirExport = (data: AirExportAdminApi.AirExportCopyDto) => {
  return requestClient.post<string>(`${API_PREFIX}/CopyAsync`, data);
};

/** 删除：参数在请求体里，必须用 { data } 传；有费用的票删不掉 */
export const deleteAirExport = (id: string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id: String(id) },
  });
};

/** 重新生成委托编号，返回新编号（基准是该票的起飞日期） */
export const updateAirExportCommissionNum = (id: string) => {
  return requestClient.put<string>(`${API_PREFIX}/UpdateCommissionNumAsync`, {
    id: String(id),
  });
};

export const getAirExportAttachments = (id: string) => {
  return requestClient.get<AirExportAdminApi.AttachmentGroupDto[]>(
    `${API_PREFIX}/GetAttachmentsAsync`,
    { params: { Id: String(id) } },
  );
};

export const addAirExportAttachments = (
  data: AirExportAdminApi.AirExportAttachmentsAddDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/AddAttachmentsAsync`, data);
};

export const deleteAirExportAttachments = (
  data: AirExportAdminApi.AirExportAttachmentsDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAttachmentsAsync`, {
    data,
  });
};
