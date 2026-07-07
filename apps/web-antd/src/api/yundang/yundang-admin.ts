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

export const { batchSubscribeOceanBill } = YundangAdminApi;
