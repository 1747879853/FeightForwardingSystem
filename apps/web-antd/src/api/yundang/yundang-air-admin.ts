import { requestClient } from '#/api/request';

export namespace YundangAirAdminApi {
  export interface YundangAirBatchSubscribeInputDto {
    /** 待订阅的空运出口 Id 集合，单次最多 30 条（超出后端自动分批） */
    airExportIds: string[];
  }

  export interface YundangAirSubscribeItemResultDto {
    airExportId: string;
    /** 本地业务键（空运出口 Id 无连字符 + 递增序号） */
    localKey?: string;
    /** 订阅单号（主运单号 AWB） */
    referenceNo?: string;
    /** 航司代码（服务商自动识别后可能回填；我方上传恒为空） */
    carrierCd?: string;
    isSuccess: boolean;
    /** 服务商返回的订阅 Id */
    yundangId?: string;
    /** 明细处理码（200 成功） */
    itemCode?: null | number;
    /** 明细处理码描述（如 success） */
    itemCodeDesc?: string;
    /** 明细处理消息（失败原因；本地校验失败也写此处） */
    itemMessage?: string;
  }

  export interface YundangAirBatchSubscribeResultDto {
    totalCount: number;
    successCount: number;
    failCount: number;
    items: YundangAirSubscribeItemResultDto[];
  }

  export interface YundangAirSubscriptionInfoDto {
    id: string;
    airExportId: string;
    localKey?: string;
    /** 订阅单号（主运单号 AWB） */
    referenceNo?: string;
    /** 航司代码（服务商自动识别后的结果，如 MF） */
    carrierCd?: string;
    /** 始发地三字码 */
    org?: string;
    /** 目的地三字码 */
    dest?: string;
    /** 扩展字段 JSON */
    extendNo?: string;
    yundangId?: string;
    itemCode?: null | number;
    itemCodeDesc?: string;
    itemMessage?: string;
    isSuccess: boolean;
    billCreateTime?: string;
    subscribeTime: string;
    lastPushTime?: null | string;
  }

  export interface YundangAirShipmentFlightInfoDto {
    id: string;
    /** 航段序号 */
    sno?: null | number;
    flightNo?: string;
    flightDate?: string;
    /** 起飞地 */
    org?: string;
    /** 起飞地代码 */
    orgCd?: string;
    /** 目的地 */
    dest?: string;
    /** 目的地代码 */
    destCd?: string;
    etd?: string;
    eta?: string;
    atd?: string;
    ata?: string;
    pieces?: string;
    weight?: string;
    volume?: string;
  }

  export interface YundangAirShipmentStatusInfoDto {
    id: string;
    yundangStatusId?: string;
    sno?: null | number;
    statusCd?: string;
    /** 状态描述（中文） */
    statusDesc?: string;
    /** 状态描述（英文） */
    statusDescEn?: string;
    flightNo?: string;
    eventTime?: string;
    place?: string;
    placeCd?: string;
    transportMode?: string;
    pieces?: string;
    weight?: string;
    volume?: string;
    /** 是否预计（true=预计，false=实际） */
    isEstimate?: boolean | null;
    /** 数据状态，add=新增，update=更新 */
    dataState?: string;
    dateUpdateTime?: string;
    /** 数据来源代码 */
    sourceCd?: string;
  }

  export interface YundangAirShipmentNodeInfoDto {
    id: string;
    /** 节点序号 */
    sno?: null | number;
    /** 节点状态代码（如 DEP/ARR/DLV） */
    stateCode?: string;
    /** 节点描述（英文） */
    stateDesc?: string;
    /** 节点描述（中文，如 起飞/抵达/提货） */
    stateDescCN?: string;
    /** 运输节点（地点三字码） */
    transport?: string;
    /** 是否已实际发生 */
    isActuality?: boolean | null;
    /** 已完成数量 */
    count?: null | number;
    /** 总数量 */
    total?: null | number;
    planTime?: string;
    estimateTime?: string;
    actualityTime?: string;
  }

  export interface YundangAirShipmentInfoDto {
    id: string;
    yundangId?: string;
    deliveryNo?: string;
    orderNo?: string;
    localKey?: string;
    /** 服务商机构码 */
    orgCode?: string;
    customer?: string;
    extendNo?: string;
    /** 航空运单号 */
    awbNo?: string;
    referenceNo?: string;
    carrierCd?: string;
    /** 航司名称 */
    carrier?: string;
    /** 处理状态 */
    status?: string;
    /** 错误描述 */
    errorDes?: string;
    pieces?: string;
    weight?: string;
    volume?: string;
    flightNo?: string;
    /** 起飞地代码 */
    orgCd?: string;
    /** 起飞地 */
    org?: string;
    /** 目的地代码 */
    destCd?: string;
    /** 目的地 */
    dest?: string;
    /** 实际起飞时间 */
    atd?: string;
    /** 预计起飞时间 */
    etd?: string;
    /** 实际到达时间 */
    ata?: string;
    /** 预计到达时间 */
    eta?: string;
    endTrackTime?: string;
    currentStatusCd?: string;
    currentStatus?: string;
    currentStatusTime?: string;
    currentPlaceCd?: string;
    currentPlace?: string;
    firstEta?: string;
    trackStatus?: string;
    endId?: string;
    endStatus?: string;
    errorStatus?: string;
    errorMessage?: string;
    dataStatus?: string;
    serviceType?: string;
    billCreateTime?: string;
    firstUpdateTime?: string;
    dataUpdateTime?: string;
    subscriptionId?: null | string;
    airExportId?: null | string;
    lastPushTime: string;
    flights: YundangAirShipmentFlightInfoDto[];
    statuses: YundangAirShipmentStatusInfoDto[];
    nodes: YundangAirShipmentNodeInfoDto[];
  }

  export interface YundangAirPushInfoDto {
    airExportId: string;
    subscription: null | YundangAirSubscriptionInfoDto;
    shipment: null | YundangAirShipmentInfoDto;
  }

  /**
   * 空运运单批量订阅
   * POST services/app/YundangAdmin/BatchSubscribeAirBillAsync
   */
  export const batchSubscribeAirBill = (
    data: YundangAirBatchSubscribeInputDto,
  ) => {
    return requestClient.post<YundangAirBatchSubscribeResultDto>(
      'services/app/YundangAdmin/BatchSubscribeAirBillAsync',
      data,
    );
  };

  /**
   * 按空运出口 Id 查询运踪订阅记录与运单动态
   * GET services/app/YundangAdmin/GetAirPushInfoAsync
   */
  export const getAirPushInfo = (airExportId: string) => {
    return requestClient.get<YundangAirPushInfoDto>(
      'services/app/YundangAdmin/GetAirPushInfoAsync',
      {
        params: { airExportId },
      },
    );
  };
}

export const { batchSubscribeAirBill, getAirPushInfo } = YundangAirAdminApi;
