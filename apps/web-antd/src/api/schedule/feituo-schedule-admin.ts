import { requestClient } from '#/api/request';

export namespace FeituoScheduleAdminApi {
  /** 船期查询入参 */
  export interface FeituoScheduleQueryInputDto {
    /** 起始港五字码，如 CNSHA（后端自动转大写） */
    polCode: string;
    /** 目的港五字码，如 USLGB（后端自动转大写） */
    podCode: string;
    /** 预计离港日期 yyyy-MM-dd */
    etd: string;
    /** 范围(周) 1=7天…8=56天；传 eta 时不生效，但仍需传入 */
    weeksOut: number;
    /** 预计到港日期，与 etd 组合查询，传入后 weeksOut 不生效 */
    eta?: string;
    /** 船公司代码，仅支持单个 */
    carrierCd?: string;
    /** 头程航线代码 */
    routeCode?: string;
    /** 中转标识 0直达 1中转，不传返回全部 */
    isTransit?: null | number;
    /** 第1次中转港口名 */
    transitPortEn?: string;
    /** 船名 */
    vessel?: string;
    /** 页码，默认 1 */
    pageNum?: number;
    /** 每页条数，最大 1000，默认 100 */
    pageSize?: number;
  }

  /** 中转港明细 */
  export interface FeituoScheduleTransitDto {
    /** 中转港英文名(标准化) */
    portName?: string;
    /** 中转港五字码 */
    portCode?: string;
    /** 中转港航线代码 */
    routeCode?: string;
    /** 中转港船名 */
    vessel?: string;
    /** 中转港航次 */
    voyage?: string;
    /** 运输方式 */
    transportMode?: string;
    /** 预计到港日期 */
    eta?: string;
    /** 预计离港日期 */
    etd?: string;
    /** 中转港码头(标准名称) */
    terminal?: string;
    /** 中转港顺序(已按此升序排列) */
    sort?: null | number;
  }

  /** 船期明细 */
  export interface FeituoScheduleItemDto {
    /** 船公司代码 */
    carrierCd?: string;
    /** 船公司SCAC */
    scac?: string;
    /** 航线代码 */
    routeCode?: string;
    /** 标准航线代码 */
    displayName?: string;
    /** 船名 */
    vessel?: string;
    /** 航次 */
    voyage?: string;
    /** 运输方式(VESSEL大船/TRUCK卡车/RAIL铁路/FEEDER驳船/BARGE支线) */
    transportMode?: string;
    /** 母船简称 */
    shipManager?: string;
    /** 起运港英文名(标准化) */
    polName?: string;
    /** 起运港五字码 */
    polCode?: string;
    /** 起运港码头(标准名称) */
    polTerminal?: string;
    /** 目的港英文名(标准化) */
    podName?: string;
    /** 目的港五字码 */
    podCode?: string;
    /** 目的港码头(标准名称) */
    podTerminal?: string;
    /** 预计离港日期 */
    etd?: string;
    /** 预计到港日期 */
    eta?: string;
    /** 计划离港日期 */
    staticEtd?: string;
    /** 计划到港日期 */
    staticEta?: string;
    /** 预计航程(天) */
    totalDuration?: null | number;
    /** 计划航程(天) */
    transitTime?: null | number;
    /** 是否中转(true中转 false直达) */
    isTransit?: boolean;
    /** 截关时间 */
    cyCutoff?: string;
    /** 截单时间 */
    siCutoff?: string;
    /** 截VGM时间 */
    vgmCutoff?: string;
    /** 截订舱时间 */
    bookingCutoff?: string;
    /** 截港时间 */
    inlandCutoff?: string;
    /** 最后更新时间 */
    updateTime?: string;
    /** 中转港明细(直达为空) */
    transits?: FeituoScheduleTransitDto[];
  }

  /** 船期查询返回结构 */
  export interface FeituoScheduleResultDto {
    /** 状态码(20000有数据 20001无数据) */
    statusCode?: number;
    /** 提示信息 */
    message?: string;
    /** 总条数 */
    total?: number;
    /** 当前页 */
    pageNum?: number;
    /** 每页条数 */
    pageSize?: number;
    /** 总页数 */
    pages?: number;
    /** 船期明细 */
    items?: FeituoScheduleItemDto[];
  }
}

const API_PREFIX = '/services/app/FeituoScheduleAdmin';

/**
 * 飞驼船期查询（实时查询，不落库）
 * POST /services/app/FeituoScheduleAdmin/QueryScheduleAsync
 */
export function queryScheduleAsync(
  params: FeituoScheduleAdminApi.FeituoScheduleQueryInputDto,
) {
  return requestClient.post<FeituoScheduleAdminApi.FeituoScheduleResultDto>(
    `${API_PREFIX}/QueryScheduleAsync`,
    params,
  );
}
