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
  }

  export interface YundangShipmentContainerInfoDto {
    id: string;
    ctnrNo?: string;
    sealNo?: string;
    ctnrSize?: string;
    ctnrType?: string;
    currentStatusCd?: string;
    currentStatus?: string;
    currentStatusTime?: string;
    currentPlaceCd?: string;
    currentPlace?: string;
    statuses: YundangShipmentContainerStatusInfoDto[];
  }

  export interface YundangShipmentCarriageInfoDto {
    id: string;
    sno?: number | null;
    polCd?: string;
    podCd?: string;
    etd?: string;
    atd?: string;
    eta?: string;
    ata?: string;
    vesselName?: string;
    voy?: string;
  }

  export interface YundangShipmentOceanNodeInfoDto {
    id: string;
    stateCode?: string;
    stateDesc?: string;
    stateDescCN?: string;
    place?: string;
    isCurrent?: boolean | null;
    planTime?: string;
    estimateTime?: string;
    actualityTime?: string;
  }

  export interface YundangShipmentInfoDto {
    id: string;
    yundangId?: string;
    requestId?: string;
    localKey?: string;
    referenceNo?: string;
    blNo?: string;
    bkgNo?: string;
    ctnrNo?: string;
    carrierCd?: string;
    carrier?: string;
    vesselName?: string;
    voyage?: string;
    polCd?: string;
    pol?: string;
    podCd?: string;
    pod?: string;
    etd?: string;
    eta?: string;
    ata?: string;
    dlptTime?: string;
    dataUpdateTime?: string;
    trackStatus?: string;
    trackStatusCd?: string;
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
