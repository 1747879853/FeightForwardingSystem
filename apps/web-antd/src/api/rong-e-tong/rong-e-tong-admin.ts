import { requestClient } from '#/api/request';

/**
 * 荣E通（三方接口）Admin API。
 * 页面文案勿出现供应商名称，统一称「三方接口」。
 */
export namespace RongETongApi {
  /** 即时运价查询入参 */
  export interface SpotQueryInputDto {
    /** 起运港 Id，港口须维护 EDI 代码（雪花 ID 字符串透传） */
    polId: number | string;
    /** 目的港 Id，港口须维护 EDI 代码（雪花 ID 字符串透传） */
    podId: number | string;
    /**
     * 起运港运输类型：`CY` 堆场，`SD` 门点。
     * 必填；未选或非法值时勿调接口。
     */
    polServiceType: 'CY' | 'SD';
    /**
     * 目的港运输类型：`CY` 堆场，`SD` 门点。
     * 必填；未选或非法值时勿调接口。
     */
    podServiceType: 'CY' | 'SD';
    /** 箱型 Id，至少 1 个；重复只查一次（雪花 ID 字符串透传） */
    ctnCodeIds: Array<number | string>;
  }

  /** 即时运价查询 —— 箱型 */
  export interface SpotCtnCodeDto {
    id: number;
    ctnName?: string;
    /** 柜型：0 普柜，1 特种柜 */
    cabinetType?: number;
    ctnSize?: string;
    ctnType?: string;
    teu?: number;
  }

  /** 航线途经港口 */
  export interface SpotRouteInfoDto {
    ediCode?: string;
    portName?: string;
    portCountry?: string;
    portTerm?: string;
    vessel?: string;
    innerVoyno?: string;
    routeCode?: string;
    etd?: string;
    eta?: string;
  }

  /** 费用明细 */
  export interface SpotFeeDetailDto {
    categoryName?: string;
    /** P 预付，C 到付 */
    paymentMethod?: string;
    /** 0 按箱，1 按票；其他计费单位时为空 */
    priceFeeType?: null | number;
    currency?: string;
    price?: number;
  }

  /** 费用分类分组 */
  export interface SpotFeeGroupDto {
    feeCategoryName?: string;
    feeDetailList?: SpotFeeDetailDto[];
  }

  /** Spot 费用 */
  export interface SpotFeeInfoDto {
    spotFeeName?: string;
    currency?: string;
    /** 单价，原样字符串 */
    price?: string;
  }

  /** 滞箱/滞港/堆存明细 */
  export interface SpotDndDetailDto {
    destination?: string;
    /** 区间（天），如 1-10 */
    validityPeriod?: string;
    currency?: string;
    /** 费用，原样字符串 */
    cost?: string;
  }

  /** 滞箱/滞港/堆存分组。type：1 滞箱，2 滞港，3 堆存，4 合并计算 */
  export interface SpotDndGroupDto {
    type?: number;
    dndDetailInfoList?: SpotDndDetailDto[];
  }

  /** 单条船司船名航次运价 */
  export interface SpotItemDto {
    quotationUnique?: string;
    /** 三方船司代码，与系统船公司代码不一定一致 */
    carrierCode?: string;
    etd?: string;
    eta?: string;
    /** 航程（天） */
    voyage?: number;
    isDirect?: boolean;
    vessel?: string;
    /** 船公司航次 */
    innerVoyno?: string;
    routeCode?: string;
    freightCurrency?: string;
    freightAmount?: number;
    totalCurrency?: string;
    totalAmount?: number;
    isSoldOut?: boolean;
    validTimeEnd?: null | string;
    quotationUpdateTime?: string;
    routeInfoList?: SpotRouteInfoDto[];
    feeGroupInfoList?: SpotFeeGroupDto[];
    spotFeeInfoList?: SpotFeeInfoDto[];
    dndGroupInfoList?: SpotDndGroupDto[];
  }

  /**
   * 即时运价查询结果（按箱型一条，顺序与入参 ctnCodeIds 一致）。
   * status：1 已完成，2 失败（返回时不会出现 0）。
   */
  export interface SpotQueryResultDto {
    id?: string;
    ctnCode?: SpotCtnCodeDto;
    status?: number;
    creationTime?: string;
    /** 是否复用了 1 小时内同样条件的查询 */
    isReused?: boolean;
    errorMessage?: null | string;
    spotList?: SpotItemDto[];
  }

  /** 场站实时查箱入参 */
  export interface RealQueryInputDto {
    seaExportIds: string[];
    /** true 时已提箱的票不查询、不算失败 */
    skipPickedUp?: boolean;
  }

  /** 场站查箱失败项。reason 见文档枚举 RongETongRealQueryFailReason */
  export interface RealQueryFailItemDto {
    commissionNum?: null | string;
    reason?: number;
  }

  /** 舱单口岸：1 上海，2 青岛 */
  export type ManifestPort = 1 | 2;

  /** 舱单状态：0 未发送，1 已发送，2 已删单 */
  export type ManifestStatus = 0 | 1 | 2;

  /** 国家（简易） */
  export interface ManifestCountryDto {
    id: number | string;
    code?: string;
    countryName?: string;
    countryEnName?: string;
  }

  /** 一个收发通的舱单补充信息；为空的项发送时取收发通客户上的 */
  export interface ManifestPartyDto {
    country?: ManifestCountryDto | null;
    tel?: null | string;
    /** 以下四项只有上海舱单发送 */
    actualPerson?: null | string;
    actualTele?: null | string;
    companyId?: null | string;
    aeoCode?: null | string;
  }

  /**
   * 分提单回执。
   * msgType：1 原始，2 修改，3 删除，4 重发，5 改配。
   * resState：0 发送失败，1 已发送，2 回执错误，3 回执成功，4 退单，5 船舶未备案，6 船代统一换船。
   */
  export interface ManifestHouseDto {
    blNum?: string;
    msgType?: null | number;
    resState?: null | number;
    resMessage?: null | string;
    noticeTime?: null | string;
    loadingMessage?: null | string;
    loadingTime?: null | string;
  }

  /** 已存的舱单 */
  export interface ManifestRecordDto {
    id: string;
    /** 发送时的口岸，第一次发送成功前为空 */
    port?: ManifestPort | null;
    outTradeCode?: null | string;
    status: ManifestStatus;
    sendTime?: null | string;
    /** 是否货主自有箱（SOC），false 为船东箱（COC） */
    isSoc: boolean;
    /** 是否有集港计划后自动发送，只有青岛用 */
    isDraftPlan: boolean;
    remark?: null | string;
    shipper?: ManifestPartyDto | null;
    consignee?: ManifestPartyDto | null;
    notifier?: ManifestPartyDto | null;
    houses?: ManifestHouseDto[];
    creationTime?: string;
    creatorUserName?: null | string;
    lastModificationTime?: null | string;
    lastModifierUserName?: null | string;
  }

  /** 待发送舱单的一条货物明细 */
  export interface ManifestHousePreviewDto {
    blNum?: null | string;
    ctnNo?: null | string;
    containerTypeName?: null | string;
    sealNo?: null | string;
    containerOwnerName?: null | string;
    packageNum?: null | string;
    unitName?: null | string;
    grossWeight?: null | number;
    volume?: null | number;
    marks?: null | string;
    goodsDes?: null | string;
    hsCode?: null | string;
    dgNo?: null | string;
    dgLevel?: null | string;
    vgmGrossWeight?: null | number;
  }

  /** 待发送舱单的一个收发通 */
  export interface ManifestPartyPreviewDto {
    partyName?: null | string;
    address?: null | string;
    countryName?: null | string;
    partyTele?: null | string;
  }

  /** 按海运出口拼出来的待发送舱单，名称类字段已是三方要的写法 */
  export interface ManifestPreviewDto {
    mblNum?: null | string;
    bookingNum?: null | string;
    carrierName?: null | string;
    cargoName?: null | string;
    billLadingTypeName?: null | string;
    originalNumber?: null | string;
    paymentTermNameCn?: null | string;
    placeIssueName?: null | string;
    shippingItem?: null | string;
    vessel?: null | string;
    innerVoyno?: null | string;
    shipAgentName?: null | string;
    placeReceiptName?: null | string;
    portLoadingName?: null | string;
    portDischargeName?: null | string;
    placeDeliveryName?: null | string;
    dgContact?: null | string;
    dgTel?: null | string;
    temperatureUnitName?: null | string;
    reeferTemperature?: null | string;
    reeferVentilation?: null | string;
    webCode?: null | string;
    houses?: ManifestHousePreviewDto[];
    shipper?: ManifestPartyPreviewDto | null;
    consignee?: ManifestPartyPreviewDto | null;
    notifier?: ManifestPartyPreviewDto | null;
  }

  /** 舱单页数据 */
  export interface ManifestDto {
    seaExportId: string;
    /** 按当前起运港判断的口岸；不支持时为空，此时 unsupportedMessage 有值 */
    port?: ManifestPort | null;
    unsupportedMessage?: null | string;
    manifest?: ManifestRecordDto | null;
    preview?: ManifestPreviewDto | null;
    /** 资料不完整的地方；有值时发送、重发、改单、补发分票会报错 */
    errors?: string[];
  }

  /** 一个收发通的舱单补充信息（保存用） */
  export interface ManifestPartyInputDto {
    countryId?: null | number | string;
    tel?: null | string;
    actualPerson?: null | string;
    actualTele?: null | string;
    companyId?: null | string;
    aeoCode?: null | string;
  }

  /** 保存舱单补充信息 */
  export interface ManifestSaveDto {
    seaExportId: string;
    isSoc: boolean;
    isDraftPlan: boolean;
    remark?: null | string;
    shipper?: ManifestPartyInputDto;
    consignee?: ManifestPartyInputDto;
    notifier?: ManifestPartyInputDto;
  }

  /** 舱单删单；blNums 不传或为空时整票删除 */
  export interface ManifestDeleteInputDto {
    seaExportId: string;
    reason: string;
    blNums?: string[];
  }

  /** 青岛舱单补发分票 */
  export interface ManifestAddSubInputDto {
    seaExportId: string;
    blNums: string[];
  }

  /** 船代查询结果（三方写法） */
  export interface ManifestShipAgentDto {
    shipAgentName?: null | string;
    shipAgentCode?: null | string;
    carrierName?: null | string;
    carrierCode?: null | string;
  }
}

const MANIFEST_API_PREFIX = '/services/app/RongETongAdmin';

/** 舱单发送类接口要等三方返回，单次最长 60 秒，前端放宽到 90 秒 */
const MANIFEST_TIMEOUT = 90_000;

/** 舱单页数据：口岸、已存舱单、按海运出口现拼的待发送内容 */
export function getManifestAsync(seaExportId: string) {
  return requestClient.post<RongETongApi.ManifestDto>(
    `${MANIFEST_API_PREFIX}/GetManifestAsync`,
    { id: seaExportId },
  );
}

/** 保存舱单补充信息 */
export function saveManifestAsync(data: RongETongApi.ManifestSaveDto) {
  return requestClient.post(`${MANIFEST_API_PREFIX}/SaveManifestAsync`, data);
}

/** 第一次发送舱单 */
export function sendManifestAsync(seaExportId: string) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/SendManifestAsync`,
    { id: seaExportId },
    { timeout: MANIFEST_TIMEOUT },
  );
}

/** 重发舱单 */
export function resendManifestAsync(seaExportId: string) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/ResendManifestAsync`,
    { id: seaExportId },
    { timeout: MANIFEST_TIMEOUT },
  );
}

/** 舱单改单 */
export function updateManifestAsync(seaExportId: string) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/UpdateManifestAsync`,
    { id: seaExportId },
    { timeout: MANIFEST_TIMEOUT },
  );
}

/** 舱单删单 */
export function deleteManifestAsync(data: RongETongApi.ManifestDeleteInputDto) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/DeleteManifestAsync`,
    data,
    {
      timeout: MANIFEST_TIMEOUT,
    },
  );
}

/** 刷新舱单回执 */
export function refreshManifestAsync(seaExportId: string) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/RefreshManifestAsync`,
    { id: seaExportId },
    { timeout: MANIFEST_TIMEOUT },
  );
}

/** 按海运出口的船名、航次、主提单号、船公司查船代 */
export function queryManifestShipAgentAsync(seaExportId: string) {
  return requestClient.post<RongETongApi.ManifestShipAgentDto>(
    `${MANIFEST_API_PREFIX}/QueryManifestShipAgentAsync`,
    { id: seaExportId },
    { timeout: MANIFEST_TIMEOUT },
  );
}

/** 青岛舱单补发分票 */
export function addSubManifestAsync(data: RongETongApi.ManifestAddSubInputDto) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/AddSubManifestAsync`,
    data,
    {
      timeout: MANIFEST_TIMEOUT,
    },
  );
}

/** 青岛舱单改配，只改船名航次 */
export function updateManifestConfigAsync(seaExportId: string) {
  return requestClient.post(
    `${MANIFEST_API_PREFIX}/UpdateManifestConfigAsync`,
    { id: seaExportId },
    { timeout: MANIFEST_TIMEOUT },
  );
}

/**
 * 即时运价查询。后端最长等 120 秒，前端超时放宽到 180 秒。
 */
export function spotQueryAsync(data: RongETongApi.SpotQueryInputDto) {
  return requestClient.post<RongETongApi.SpotQueryResultDto[]>(
    '/services/app/RongETongAdmin/SpotQueryAsync',
    data,
    { timeout: 180_000 },
  );
}

/**
 * 场站实时查箱并回写船名/航次/业务箱。
 * result 只含失败的票；全部成功时为 []。
 */
export function realQueryAsync(data: RongETongApi.RealQueryInputDto) {
  return requestClient.post<RongETongApi.RealQueryFailItemDto[]>(
    '/services/app/RongETongAdmin/RealQueryAsync',
    data,
  );
}
