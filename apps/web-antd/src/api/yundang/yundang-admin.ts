import { requestClient } from '#/api/request';

export namespace YundangAdminApi {
  /** 订阅场景 */
  export const YundangOceanSubscribeScene = {
    Normal: 0,
    SpecifiedContainer: 1,
    Sino: 2,
    History: 3,
    AutoCarrier: 4,
    Comprehensive: 5,
  } as const;

  export type YundangOceanSubscribeSceneValue =
    (typeof YundangOceanSubscribeScene)[keyof typeof YundangOceanSubscribeScene];

  /** 单号类型 */
  export const YundangReferenceType = {
    BL: 0,
    BK: 1,
    CN: 2,
  } as const;

  export type YundangReferenceTypeValue =
    (typeof YundangReferenceType)[keyof typeof YundangReferenceType];

  export interface YundangOceanBatchSubscribeInputDto {
    seaExportIds: string[];
    scene?: YundangOceanSubscribeSceneValue;
    referenceType?: YundangReferenceTypeValue;
    serviceType?: string;
    noticeEmail?: string;
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
}

export const {
  batchSubscribeOceanBill,
  YundangOceanSubscribeScene,
  YundangReferenceType,
} = YundangAdminApi;
