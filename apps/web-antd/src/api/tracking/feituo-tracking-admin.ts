import { requestClient } from '#/api/request';

/**
 * 运踪（集装箱综合跟踪 / 航空货运跟踪）服务商接口。
 *
 * 用户侧展示一律称「运踪」，不得出现服务商名称；后端接口地址与字段名保持原样。
 */
export namespace FeituoTrackingAdminApi {
  /** 集装箱跟踪业务类型：0=海运出口，1=海运进口 */
  export enum TrackingBizType {
    SeaExport = 0,
    SeaImport = 1,
  }

  // ==================== 集装箱跟踪：订阅 ====================

  export interface ContainerSubscribeInputDto {
    /** 业务类型：0=海运出口，1=海运进口 */
    bizType: TrackingBizType;
    /** 业务单 Id 集合（海出 Id / 海进 Id），可批量，后端自动去重 */
    orderIds: string[];
  }

  export interface ContainerSubscribeItemResultDto {
    /** 业务单 Id */
    orderId: string;
    bizType: TrackingBizType;
    /** 本地订阅记录 Id（订阅记录创建成功才有） */
    subscriptionId?: null | string;
    isSuccess: boolean;
    /** 上传的单号（按箱号订阅时为空） */
    billNo?: string;
    /** 上传的箱号（按单号订阅时为空） */
    containerNo?: string;
    /** 上传的船公司代码（取船公司 EdiCode） */
    carrierCode?: string;
    /** 上传的客户自定义业务编号 */
    businessNo?: string;
    /** 服务商状态码（20000 有数据，20001 订阅成功但暂无数据） */
    statusCode?: number;
    /** 服务商提示信息 */
    message?: string;
    /** 服务商异常提示信息 */
    alertMessage?: string;
    /** 失败原因（本地校验失败或请求异常时有值） */
    errorMessage?: string;
    /** 本次返回的跟踪数据 */
    data?: null | ContainerDataDto;
  }

  export interface ContainerSubscribeResultDto {
    total: number;
    successCount: number;
    failedCount: number;
    items: ContainerSubscribeItemResultDto[];
  }

  // ==================== 集装箱跟踪：查询 ====================

  export interface ContainerTrackingInputDto {
    bizType: TrackingBizType;
    /** 业务单 Id（单条） */
    orderId: string;
  }

  export interface ContainerTrackingDto {
    orderId: string;
    bizType: TrackingBizType;
    /** false 表示该单从未订阅过 */
    hasSubscription: boolean;
    subscriptionId?: null | string;
    isSuccess: boolean;
    billNo?: string;
    containerNo?: string;
    carrierCode?: string;
    businessNo?: string;
    /** 最近一次订阅/回查时间 */
    subscribeTime?: null | string;
    /** 最近一次收到推送的时间 */
    lastPushTime?: null | string;
    /** 最近一次回查落库时间 */
    lastQueryTime?: null | string;
    message?: string;
    alertMessage?: string;
    errorMessage?: string;
    /** 跟踪数据；未取到数据时为 null */
    data?: null | ContainerDataDto;
  }

  // ==================== 集装箱跟踪：数据结构 ====================

  /** 跟踪数据（订阅与查询接口的 data 结构一致） */
  export interface ContainerDataDto {
    /** 请求参数集合（原始参数 / 实际取数参数） */
    query?: null | Record<string, unknown>;
    result?: null | ContainerResultDto;
  }

  export interface ContainerCarrierDto {
    nameCn?: string;
    nameEn?: string;
    code?: string;
    scac?: string;
    url?: string;
    /** 船公司使用状态：0 使用中，1 不支持，2 维护中 */
    status?: string;
  }

  export interface ContainerBookingDto {
    bookingStatus?: string;
    bookingStatusCn?: string;
    /** 箱汇总（箱型、个数），如 3*20GP */
    totalContainers?: string;
    priceCalculationDate?: string;
  }

  /** 当前状态（服务商已算好的「当前节点」） */
  export interface ContainerCurrentStatusDto {
    transportMode?: string;
    vslName?: string;
    voy?: string;
    containerNo?: string;
    eventCode?: string;
    /** 发生时间（服务商原样字符串，如 2025/09/01 00:00:00） */
    eventTime?: string;
    /** N=实际发生，Y=预计发生 */
    isEsti?: string;
    eventPlace?: string;
    descriptionCn?: string;
    descriptionEn?: string;
    portCode?: string;
    lat?: null | number;
    lon?: null | number;
    terminalName?: string;
    /** 数据来源：0 港区，1 船公司，2 服务商判断，3 船舶 AIS */
    source?: null | number;
    mmsi?: string;
  }

  /** 箱物流节点 */
  export interface ContainerStatusNodeDto {
    transportMode?: string;
    /** 船名或车牌号 */
    vslName?: string;
    voy?: string;
    eventCode?: string;
    eventTime?: string;
    /** N=实际发生，Y=预计发生 */
    isEsti?: string;
    eventPlace?: string;
    descriptionCn?: string;
    descriptionEn?: string;
    portCode?: string;
    terminalName?: string;
    source?: null | number;
  }

  export interface ContainerItemDto {
    containerNo?: string;
    /** 标准箱型箱尺寸，如 20GP */
    containerTypeGroup?: string;
    containerType?: string;
    containerSize?: string;
    sealNo?: string;
    currentStatusCode?: string;
    currentStatusDescriptionCn?: string;
    currentStatusDescriptionEn?: string;
    eventPlace?: string;
    portCode?: string;
    /** 当前是否甩柜 */
    offLoadOfCarrier?: null | boolean;
    /** FCL 整箱，LCL 拼箱 */
    serviceType?: string;
    status?: ContainerStatusNodeDto[];
  }

  export interface ContainerResultDto {
    billNo?: string;
    containerNo?: string;
    /** 单号类型：BL 提单号 / BK 订舱号 */
    billCategory?: string;
    /** 数据状态，如 COMPLETE */
    statusCategory?: string;
    statusDescription?: string;
    /** 业务结束时间（结束后不再更新与推送） */
    endTime?: string;
    /** 最后数据变化的更新时间 */
    updateTime?: string;
    firstObtainDataTime?: string;
    /** 可视化轨迹页短链接（密文） */
    iframeShortUrl?: string;
    /** 可视化轨迹页链接，可直接内嵌 iframe */
    iframeUrl?: string;
    carrier?: null | ContainerCarrierDto;
    booking?: null | ContainerBookingDto;
    currentStatus?: null | ContainerCurrentStatusDto;
    containers?: ContainerItemDto[];
    /** 以下明细如需展示再补类型 */
    receipt?: null | Record<string, unknown>;
    delivery?: null | Record<string, unknown>;
    firstVessel?: null | Record<string, unknown>;
    terminalPlan?: null | Record<string, unknown>;
    places?: Record<string, unknown>[];
    routes?: Record<string, unknown>[];
    vessel?: Record<string, unknown>[];
    document?: null | Record<string, unknown>;
  }

  // ==================== 海运运踪摘要（列表 + 详情） ====================

  /** 海运（集装箱）运踪摘要，随海运出口/进口列表与详情下发 */
  export interface ContainerTrackingSummaryDto {
    // -- 订阅状态 --
    isSubscribed?: boolean;
    isSubscribeSuccess?: boolean;
    /** 订阅用的单号（按箱号订阅时为空） */
    billNo?: string;
    /** 订阅用的箱号（按单号订阅时为空） */
    containerNo?: string;
    /** 订阅失败原因（原文可能含服务商名，展示前需清洗） */
    errorMessage?: string;
    lastQueryTime?: null | string;
    lastPushTime?: null | string;

    // -- 整票数据状态 --
    /** 数据状态，如 COMPLETE */
    statusCategory?: string;
    statusDescription?: string;
    /** 服务商最后数据变化时间（数据新鲜度） */
    updateTime?: string;
    endTime?: string;

    // -- 当前节点（列表主展示） --
    /** 状态描述中文，列表主展示字段 */
    currentDescriptionCn?: string;
    currentDescriptionEn?: string;
    currentEventCode?: string;
    currentEventTime?: string;
    /** N=实际发生，Y=预计发生 */
    currentIsEsti?: string;
    currentEventPlace?: string;
    currentPortCode?: string;
    currentTransportMode?: string;
    currentVslName?: string;
    currentVoy?: string;
    currentTerminalName?: string;
    currentLat?: null | number;
    currentLon?: null | number;
    currentSource?: null | number;

    // -- 关键时间 --
    polEtd?: string;
    polAtd?: string;
    podSta?: string;
    podEta?: string;
    podAta?: string;

    // -- 船期与订舱 --
    firstVesselName?: string;
    firstVesselVoyage?: string;
    firstVesselRouteCode?: string;
    bookingStatusCn?: string;
    /** 箱汇总，如 3*20GP */
    bookingTotalContainers?: string;

    // -- 异常与外链 --
    /** 是否存在甩柜 */
    hasOffLoadOfCarrier?: boolean;
    /** 被甩柜的箱号列表 */
    offLoadContainerNos?: string[];
    /** 是否存在异常预警（列表叹号依据） */
    hasWarning?: boolean;
    /** 异常预警累计条数 */
    warningCount?: number;
    latestWarningCategory?: string;
    latestWarningCode?: string;
    latestWarningTime?: string;
    /** 最近一条预警的中文描述，列表悬浮提示直接用它 */
    latestWarningDescription?: string;
    /** 可视化轨迹页短链接（密文） */
    iframeShortUrl?: string;
    /** 可视化轨迹页链接，对外分享时禁止直出，只能在本系统页面内嵌 */
    iframeUrl?: string;
  }

  /** 海运异常预警明细（仅业务单详情返回，按收到时间倒序） */
  export interface ContainerTrackingWarningDto {
    /** 事件类型，如 DELAY 延误 */
    eventCategory?: string;
    eventCode?: string;
    /** 事件发生时间（服务商原样字符串） */
    eventTime?: string;
    portCode?: string;
    portPlace?: string;
    /** 箱号 */
    equipmentCode?: string;
    /** 预警描述（中文），主展示字段，可能含换行 */
    description?: string;
    descriptionEn?: string;
    /** 本地收到该预警的时间 */
    receivedTime?: null | string;
  }

  // ==================== 航空货运跟踪 ====================

  export interface AirSubscribeInputDto {
    /** 空运出口 Id 集合，可批量，重复 Id 自动去重 */
    airExportIds: string[];
    /**
     * 是否强制重新订阅。默认 false 时「已订阅成功且航司单号未变」的单直接复用已有订阅，
     * 不请求服务商、不消耗配额。
     */
    forceResubscribe?: boolean;
  }

  export interface AirResubscribeInputDto {
    /** 空运出口 Id（单条） */
    airExportId: string;
  }

  export interface AirSubscribeItemResultDto {
    airExportId: string;
    /** 本地订阅记录 Id；本地校验失败时为 null */
    subscriptionId?: null | string;
    isSuccess: boolean;
    /** 本次是否直接复用已有订阅（未请求服务商，不消耗配额） */
    alreadySubscribed?: boolean;
    /** 上传的航司单号（11 位纯数字） */
    businessNumber?: string;
    /** 订阅时业务单上的主运单号原文 */
    sourceMblNum?: string;
    /** 服务商返回的订阅 Id */
    feituoSubscriptionId?: string;
    /** 服务商状态码，20000 为成功 */
    statusCode?: number;
    message?: string;
    /** 失败原因（原文可能含服务商名，展示前需清洗） */
    errorMessage?: string;
    /** 订阅后立即回查是否拿到轨迹。false 不代表订阅失败 */
    trackingLoaded?: boolean;
    /** 回查没拿到数据时的说明（原文可能含服务商名，展示前需清洗） */
    trackingMessage?: string;
  }

  export interface AirSubscribeResultDto {
    total: number;
    /** 订阅成功条数（含复用已有订阅的条数） */
    successCount: number;
    failedCount: number;
    items: AirSubscribeItemResultDto[];
  }

  /** 空运运踪摘要，随空运出口列表与详情下发 */
  export interface AirTrackingSummaryDto {
    // -- 订阅状态 --
    isSubscribed?: boolean;
    isSubscribeSuccess?: boolean;
    /** 11 位航司单号 */
    businessNumber?: string;
    feituoSubscriptionId?: string;
    errorMessage?: string;
    lastQueryTime?: null | string;
    lastPushTime?: null | string;

    // -- 整票状态 --
    /** COMPLETE 完成 / PROCESS 进行中 */
    status?: string;
    updateTime?: string;
    /** true 直达 / false 中转 */
    direct?: null | boolean;

    // -- 航空公司 --
    carrierName?: string;
    carrierNameEn?: string;
    carrierCode?: string;
    /** 航司官网跟踪地址，对外分享页禁止出现 */
    carrierUrl?: string;
    /** 1 支持 / 0 不支持 */
    carrierIsSupported?: null | number;

    // -- 货物 --
    cargoPieces?: null | number;
    cargoWeight?: null | number;
    cargoVolume?: null | number;

    // -- 当前节点 --
    currentEventCategory?: string;
    currentEventCode?: string;
    /** ACT 实际 / EST 预计 */
    currentEventClassifier?: string;
    currentEventTime?: string;
    currentDescription?: string;
    currentFlight?: string;
    currentLocationCode?: string;
    currentLocationName?: string;
    currentLocationCity?: string;
    currentLat?: null | number;
    currentLon?: null | number;

    // -- 起降 --
    originCode?: string;
    originName?: string;
    originCity?: string;
    destinationCode?: string;
    destinationName?: string;
    destinationCity?: string;
    firstFlight?: string;
    lastFlight?: string;
    destinationEta?: string;
    destinationAta?: string;

    // -- 异常预警 --
    hasWarning?: boolean;
    warningCount?: number;
    latestWarningCategory?: string;
    latestWarningCode?: string;
    latestWarningTime?: string;
    latestWarningDescription?: string;
  }

  /** 空运异常预警明细（仅业务单详情返回） */
  export interface AirTrackingWarningDto {
    eventCategory?: string;
    eventCode?: string;
    eventTime?: string;
    locationCode?: string;
    locationName?: string;
    /** 预警描述（中文），主展示字段 */
    description?: string;
    descriptionEn?: string;
  }
}

const API_PREFIX = '/services/app/FeituoAdmin';

/**
 * 集装箱综合跟踪订阅（海运出口 / 海运进口，可批量）。
 * 订阅即查询：成功时 items[].data 已带回当前全量数据，无需再调查询接口。
 * POST /services/app/FeituoAdmin/SubscribeContainerAsync
 */
export function subscribeContainerTracking(
  params: FeituoTrackingAdminApi.ContainerSubscribeInputDto,
) {
  return requestClient.post<FeituoTrackingAdminApi.ContainerSubscribeResultDto>(
    `${API_PREFIX}/SubscribeContainerAsync`,
    params,
  );
}

/**
 * 查询集装箱跟踪数据（读本地最新快照，不请求服务商）。
 * POST /services/app/FeituoAdmin/GetContainerTrackingAsync
 */
export function getContainerTracking(
  params: FeituoTrackingAdminApi.ContainerTrackingInputDto,
) {
  return requestClient.post<FeituoTrackingAdminApi.ContainerTrackingDto>(
    `${API_PREFIX}/GetContainerTrackingAsync`,
    params,
  );
}

/**
 * 航空货运跟踪订阅（空运出口，可批量）。
 * POST /services/app/FeituoAdmin/SubscribeAirWaybillAsync
 */
export function subscribeAirWaybillTracking(
  params: FeituoTrackingAdminApi.AirSubscribeInputDto,
) {
  return requestClient.post<FeituoTrackingAdminApi.AirSubscribeResultDto>(
    `${API_PREFIX}/SubscribeAirWaybillAsync`,
    params,
  );
}

/**
 * 航空货运跟踪重新订阅（单条，强制重订，会消耗一次订阅配额）。
 * POST /services/app/FeituoAdmin/ResubscribeAirWaybillAsync
 */
export function resubscribeAirWaybillTracking(
  params: FeituoTrackingAdminApi.AirResubscribeInputDto,
) {
  return requestClient.post<FeituoTrackingAdminApi.AirSubscribeItemResultDto>(
    `${API_PREFIX}/ResubscribeAirWaybillAsync`,
    params,
  );
}
