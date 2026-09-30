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
