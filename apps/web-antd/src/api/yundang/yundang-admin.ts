import { requestClient } from '#/api/request';

export namespace YundangAdminApi {
  export interface YundangOceanBatchSubscribeInputDto {
    /** 待订阅的海运出口 Id 集合，单次最多 30 条（超出后端自动分批） */
    seaExportIds: string[];
  }

  export interface YundangOceanSubscribeItemResultDto {
    seaExportId: string;
    localKey?: string;
    referenceNo?: string;
    carrierCd?: string;
    ctnrNo?: string;
    isSuccess: boolean;
    yundangId?: string;
    resultType?: string;
    resultTypeCd?: string;
    trackStatus?: string;
    error?: string;
    errorMessage?: string;
  }

  export interface YundangOceanBatchSubscribeResultDto {
    totalCount: number;
    successCount: number;
    failCount: number;
    items: YundangOceanSubscribeItemResultDto[];
  }

  export interface YundangSubscriptionInfoDto {
    id: string;
    seaExportId: string;
    localKey?: string;
    referenceNo?: string;
    blType?: string;
    carrierCd?: string;
    ctnrNo?: string;
    serviceType?: string;
    scene: number;
    polCd?: string;
    extendNo?: string;
    yundangId?: string;
    resultType?: string;
    resultTypeCd?: string;
    trackStatus?: string;
    trackStatusCd?: string;
    error?: string;
    errorMessage?: string;
    isSuccess: boolean;
    billCreateTime?: string;
    subscribeTime: string;
    lastPushTime?: string | null;
  }

  export interface YundangShipmentContainerStatusInfoDto {
    id: string;
    yundangStatusId?: string;
    statusCd?: string;
    statusDesc?: string;
    statusDescEn?: string;
    vesselName?: string;
    voyage?: string;
    eventTime?: string;
    place?: string;
    placeCd?: string;
    transportMode?: string;
    isEstimate?: boolean | null;
    dateUpdateTime?: string;
    /** 数据来源代码，1=船东；2=码头；4=云当计算 */
    sourceCd?: string;
    /** 数据状态，add=新增，update=更新 */
    dataState?: string;
  }

  /** 集装箱费用（免箱期等，主要 OOCL 船东支持） */
  export interface YundangShipmentContainerChargeInfoDto {
    id: string;
    /** 费用类型 */
    chargeType?: string;
    /** 最后免费日（Last Free Day） */
    lfd?: string;
    /** 免费天数描述 */
    freeDayDesc?: string;
  }

  export interface YundangShipmentContainerInfoDto {
    id: string;
    ctnrNo?: string;
    sealNo?: string;
    ctnrSize?: string;
    ctnrType?: string;
    /** 件数 */
    pkgs?: null | number;
    /** 毛重 */
    gwgt?: null | number;
    /** VGM */
    vgm?: null | number;
    /** 异常标识，1=甩柜，2=异常，空=无异常 */
    isRolled?: string;
    currentStatusCd?: string;
    currentStatus?: string;
    currentStatusTime?: string;
    currentPlaceCd?: string;
    currentPlace?: string;
    charges: YundangShipmentContainerChargeInfoDto[];
    statuses: YundangShipmentContainerStatusInfoDto[];
  }

  export interface YundangShipmentCarriageInfoDto {
    id: string;
    /** 云当航段 Id */
    yundangCarriageId?: string;
    sno?: number | null;
    polCd?: string;
    /** 起运港英文名 */
    polNameEn?: string;
    /** 起运港中文名 */
    polNameCn?: string;
    podCd?: string;
    /** 目的港英文名 */
    podNameEn?: string;
    /** 目的港中文名 */
    podNameCn?: string;
    etd?: string;
    atd?: string;
    eta?: string;
    ata?: string;
    /** 航段类型，1=大船，2=驳船，3=陆运 */
    type?: string;
    vesselName?: string;
    voy?: string;
    /** AIS 实际开船时间 */
    aisAtd?: string;
    /** AIS 实际到港时间 */
    aisAta?: string;
    /** AIS 预计到港时间 */
    aisEta?: string;
  }

  export interface YundangShipmentOceanNodeInfoDto {
    id: string;
    stateCode?: string;
    stateDesc?: string;
    stateDescCN?: string;
    place?: string;
    placeCd?: string;
    vesselName?: string;
    voy?: string;
    isCurrent?: boolean | null;
    /** 已完成数量 */
    count?: null | number;
    /** 总数量 */
    total?: null | number;
    planTime?: string;
    estimateTime?: string;
    actualityTime?: string;
    /** AIS 预计时间 */
    aisEstimateTime?: string;
    /** AIS 实际时间 */
    aisActualityTime?: string;
    /** 节点序号（后端已按此升序） */
    number?: null | number;
  }

  export interface YundangShipmentInfoDto {
    id: string;
    yundangId?: string;
    requestId?: string;
    /** 云当批次 Id */
    batchId?: string;
    localKey?: string;
    referenceNo?: string;
    /** 参考箱号 */
    referenceCtnrNo?: string;
    /** 交货单号 */
    deliveryNo?: string;
    /** 订单号 */
    orderNo?: string;
    blNo?: string;
    bkgNo?: string;
    ctnrNo?: string;
    carrierCd?: string;
    carrier?: string;
    vesselName?: string;
    voyage?: string;
    /** 旧船名（换船场景） */
    oldVesselName?: string;
    /** 旧航次（换船场景） */
    oldVoyage?: string;
    /** 装货地代码 */
    plrCd?: string;
    /** 装货地名称 */
    plr?: string;
    polCd?: string;
    pol?: string;
    podCd?: string;
    pod?: string;
    /** 交货地代码 */
    pldCd?: string;
    /** 交货地名称 */
    pld?: string;
    /** 开港时间 */
    cyOpenTime?: string;
    /** 截港时间 */
    cyCutOffTime?: string;
    etd?: string;
    eta?: string;
    ata?: string;
    dlptTime?: string;
    /** 卸船时间 */
    dschTime?: string;
    /** 首次预计到港时间 */
    firstEta?: string;
    /** 交货地预计到港时间 */
    etaPld?: string;
    /** 交货地实际到港时间 */
    ataPld?: string;
    /** AIS 实际开船时间 */
    aisAtd?: string;
    /** AIS 实际到港时间 */
    aisAta?: string;
    /** AIS 预计到港时间 */
    aisEta?: string;
    /** 结束跟踪时间 */
    endTrackTime?: string;
    dataUpdateTime?: string;
    /** 首次更新时间 */
    firstUpdateTime?: string;
    trackStatus?: string;
    trackStatusCd?: string;
    /** 结束状态 */
    endStatus?: string;
    /** 错误状态 */
    errorStatus?: string;
    /** 错误信息 */
    errorMessage?: string;
    /** 错误描述 */
    errorDes?: string;
    /** 数据状态 */
    dataStatus?: string;
    /** 处理状态 */
    status?: string;
    /** 客户标识 */
    customer?: string;
    /** 交货地址 */
    deliveryAddress?: string;
    /** 预计交货时间 */
    estDelTime?: string;
    /** 实际交货时间 */
    actDelTime?: string;
    /** 客户要求日期 */
    custReqDate?: string;
    /** 提货参考号 */
    pickupReference?: string;
    /** 铁路代码 */
    railCode?: string;
    /** 交货地码头 */
    terminalPld?: string;
    /** 目的港码头 */
    terminalDtp?: string;
    /** 备注 */
    remark?: string;
    /** 客户上传数据 */
    customerUploadedData?: string;
    billCreateTime?: string;
    blType?: string;
    serviceType?: string;
    subscriptionId?: string;
    seaExportId?: string;
    lastPushTime: string;
    containers: YundangShipmentContainerInfoDto[];
    carriages: YundangShipmentCarriageInfoDto[];
    oceanNodes: YundangShipmentOceanNodeInfoDto[];
  }

  export interface YundangOceanPushInfoDto {
    seaExportId: string;
    subscription: YundangSubscriptionInfoDto | null;
    shipment: YundangShipmentInfoDto | null;
  }

  /**
   * 海运运单批量订阅
   * POST services/app/YundangAdmin/BatchSubscribeOceanBillAsync
   */
  export const batchSubscribeOceanBill = (
    data: YundangOceanBatchSubscribeInputDto,
  ) => {
    return requestClient.post<YundangOceanBatchSubscribeResultDto>(
      'services/app/YundangAdmin/BatchSubscribeOceanBillAsync',
      data,
    );
  };

  /**
   * 按海运出口 Id 查询运踪订阅记录与运单动态
   * GET services/app/YundangAdmin/GetOceanPushInfoAsync
   */
  export const getOceanPushInfo = (seaExportId: string) => {
    return requestClient.get<YundangOceanPushInfoDto>(
      'services/app/YundangAdmin/GetOceanPushInfoAsync',
      {
        params: { seaExportId },
      },
    );
  };
}

export const { batchSubscribeOceanBill, getOceanPushInfo } = YundangAdminApi;
