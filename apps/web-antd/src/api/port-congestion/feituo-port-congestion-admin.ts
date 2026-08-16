import { requestClient } from '#/api/request';

export namespace FeituoPortCongestionApi {
  /** 港口拥堵查询入参 */
  export interface PortCongestionQueryInputDto {
    /** 港口五字码，如 CNNGB（后端自动 Trim 并转大写） */
    portCode: string;
    /** 是否返回船舶明细（MMSI 列表），默认 false；大港开启后响应体会膨胀数倍 */
    includeMmsi?: boolean;
  }

  /** 风力风向 */
  export interface PortWeatherWindDto {
    /** 风向角度（度） */
    direction?: string;
    /** 风速（m/s） */
    speed?: string;
    /** 风力等级 */
    power?: string;
  }

  /** 天气详情，数值字段上游均以字符串返回 */
  export interface PortWeatherDetailDto {
    portCode?: string;
    lat?: string;
    lon?: string;
    /** 天气类型 SUNNY_DAY / CLOUDY_NIGHT / OVERCAST / WINDY / HAZE / RAINY / SNOWY 等 */
    weatherType?: string;
    /** 天气级别 NORM / MILD / MODERATE / SEVERE（上游内部口径） */
    weatherLevel?: string;
    /** 天气现象原因（中文） */
    portWeatherDetails?: string;
    /** 天气现象原因（英文） */
    portWeatherDetailsEn?: string;
    /** 能见度，单位米 */
    visibility?: string;
    /** 实时气温，单位 ℃ */
    temperature?: string;
    /** 空气相对湿度，单位 % */
    humidity?: string;
    /** 大气压强，单位 Pa */
    atmosphericPressure?: string;
    /** 小时降水量，单位 mm */
    rainfall?: string;
    wind?: null | PortWeatherWindDto;
    /** 观测时间 */
    date?: string;
  }

  /** 单日拥堵情况；数值字段上游可能缺采集而为 null */
  export interface PortCongestionRowDto {
    /** 汇总日期 yyyy-MM-dd */
    key?: string;
    /** 在港总船数 */
    ataVesselCount?: null | number;
    /** 靠泊总船数 */
    atbVesselCount?: null | number;
    /** 离港总船数 */
    atdVesselCount?: null | number;
    /** 平均候泊时长，单位小时 */
    avgAtbA?: null | number;
    /** 平均作业时长，单位小时 */
    avgAtbD?: null | number;
    /** 平均在港时长，单位小时 */
    avgAtd?: null | number;
    /** 拥堵状态 A 正常 / B 轻微拥堵 / C 中度拥堵 / D 严重拥堵 */
    portStatus?: string;
    /** 拥堵原因分析（中文） */
    portStatusDetails?: string;
    /** 拥堵原因分析（英文） */
    portStatusDetailsEn?: string;
    /** 天气影响 A 正常 / B 轻微影响 / C 中度影响 / D 严重影响 */
    portWeather?: string;
    portWeatherDetails?: null | PortWeatherDetailDto;
    /** 在港船舶 MMSI，仅 includeMmsi=true 时返回 */
    ataVessels?: null | string[];
    /** 在泊船舶 MMSI，仅 includeMmsi=true 时返回 */
    atbVessels?: null | string[];
    /** 离港船舶 MMSI，仅 includeMmsi=true 时返回 */
    atdVessels?: null | string[];
  }

  /** 港口拥堵查询返回结构 */
  export interface PortCongestionResultDto {
    portCode?: string;
    /** 港口经度 */
    lon?: string;
    /** 港口纬度 */
    lat?: string;
    /** 最近 15 天，每天一条；无数据时为空数组 */
    rows?: PortCongestionRowDto[];
  }
}

const API_PREFIX = '/services/app/FeituoAdmin';

/**
 * 港口拥堵分析（实时查询，不落库，无需预先订阅）
 * POST /services/app/FeituoAdmin/QueryPortCongestionAsync
 */
export function queryPortCongestionAsync(
  params: FeituoPortCongestionApi.PortCongestionQueryInputDto,
) {
  return requestClient.post<FeituoPortCongestionApi.PortCongestionResultDto>(
    `${API_PREFIX}/QueryPortCongestionAsync`,
    params,
  );
}
