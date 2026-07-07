import { requestClient } from '#/api/request';

export namespace YgdjAdminApi {
  export interface YgdjRealQueryInputDto {
    seaExportId: string;
    /** "0"=JSON, "1"=HTML */
    reqType?: string;
  }

  export interface YgdjRealQueryContactDto {
    name?: string;
    email?: string;
    tel?: string;
    mobile?: string;
  }

  export interface YgdjRealQueryResultDto {
    code?: number | string;
    msg?: string;
    request?: string;
    contactList?: YgdjRealQueryContactDto[];
    data?: unknown;
    /** 后端若返回未匹配箱型，前端直接展示 */
    skippedCtnTypes?: string[];
    unmatchedCtnTypes?: string[];
  }

  /**
   * 场站实时查询（云港通）
   * POST services/app/YgdjAdmin/RealQueryAsync
   */
  export const realQuery = (data: YgdjRealQueryInputDto) => {
    return requestClient.post<YgdjRealQueryResultDto>(
      'services/app/YgdjAdmin/RealQueryAsync',
      data,
    );
  };
}

export const { realQuery } = YgdjAdminApi;
