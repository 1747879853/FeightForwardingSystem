import { requestClient } from '#/api/request';

/**
 * 海运出口运价相关类型定义
 */

// ==================== DTO 定义 ====================

/**
 * 船公司信息
 */
export interface CarrierDto {
  /** 主键ID */
  id: number;
  /** 中文名称 */
  cnName: string;
  /** 中文简称 */
  cnShortName: string;
  /** 英文名称 */
  enName: string;
  /** 英文简称/代码 */
  code: string;
  /** 代码别名 */
  otherCode: string;
  /** 国家ID */
  countryId: number;
  /** EDI代码 */
  ediCode: string;
  /** 备注 */
  remark: string;
  /** 国家信息（关联对象） */
  country?: CountryCodeDto;
}

/**
 * 港口信息
 */
export interface PortCodeDto {
  /** 主键ID */
  id: number;
  /** 港口英文名称 */
  portName: string;
  /** 港口中文名称 */
  cnName: string;
  /** 国家名称 */
  countryName: string;
  /** 所在大洲 */
  chau: string;
  /** 说明 */
  explain: string;
  /** 港口类型 */
  portType: string;
  /** 国家ID */
  countryId: number;
  /** 航线ID */
  laneId: number;
  /** 航线代码 */
  laneCode: string;
  /** 航线中文名称 */
  laneName: string;
  /** 航线 */
  lane: string;
  /** EDI代码 */
  ediCode: string;
  /** 统计区域 */
  statisticalArea: string;
  /** 状态：0-启用，1-禁用 */
  status: number;
}

/**
 * 航线信息
 */
export interface LaneCodeDto {
  /** 主键ID */
  id: number;
  /** 航线代码 */
  code: string;
  /** 航线中文名称 */
  laneName: string;
  /** 航线英文名称 */
  laneEnName: string;
  /** EDI代码 */
  ediCode: string;
  /** 状态：0-启用，1-禁用 */
  status: number;
}

/**
 * 国家信息
 */
export interface CountryCodeDto {
  /** 主键ID */
  id: number;
  /** 国家唯一代码 */
  code: string;
  /** 国家名称 */
  countryName: string;
  /** 国家英文名称 */
  countryEnName: string;
}

/**
 * 币别信息
 */
export interface CurrencyDto {
  /** 主键ID */
  id: number;
  /** 币别代码 */
  code: string;
  /** 币别名称 */
  name: string;
  /** 符号 */
  symbol: string;
}

/**
 * 箱型信息
 */
export interface CtnCodeDto {
  /** 主键ID */
  id: number;
  /** 集装箱类型 */
  ctnSize: string;
  /** 集装箱尺寸 */
  ctnType: string;
  /** 表现形式 */
  ctnName: string;
  /** EDI代码 */
  ediCode: string;
  /** 箱皮重 */
  ctnWeight: number;
  /** 中文说明 */
  cnExplain: string;
  /** 英文说明 */
  enExplain: string;
  /** AFR代码 */
  afrCode: string;
  /** 默认限重 */
  limitWeight: number;
  /** TEU（标准箱单位） */
  teu: number;
  /** 排序号 */
  orderNo?: number;
  /** 状态：0-启用，1-禁用 */
  status: number;
  /** 是否默认展示列 */
  isDefault: boolean;
  /** 备注 */
  remark: string;
}

/**
 * 费用代码信息
 */
export interface FeeCodeDto {
  /** 主键ID */
  id: number;
  /** 费用代码 */
  code: string;
  /** 中文名称 */
  cnName: string;
  /** 英文名称 */
  enName: string;
  /** 币别ID */
  currencyId: number;
  /** 默认计费标准代码 */
  defaultUnit: string;
  /** 默认计费标准名称 */
  defaultUnitName: string;
  /** 是否海运 */
  isSea: boolean;
  /** 是否空运 */
  isAir: boolean;
  /** 是否陆运 */
  isTrucking: boolean;
  /** 是否仓储 */
  isWms: boolean;
  /** 是否启用 */
  enable: boolean;
  /** 备注 */
  remark: string;
}

/**
 * 运价要比较字段类型
 */
export enum FreiPricePropType {
  /** 毛重 */
  GrossWeight = 1,
}

/**
 * 运价算符类型
 */
export enum FreiPriceOperatorType {
  /** 大于等于 */
  GreaterThanOrEqual = 1,
  /** 大于 */
  GreaterThan = 2,
  /** 小于等于 */
  LessThanOrEqual = 3,
  /** 小于 */
  LessThan = 4,
}

/**
 * 运价箱型费用（新增用）
 */
export interface SeFreiPriceCtnFeeAddDto {
  /** 箱型ID（新建时通过CtnCodeId关联对应的箱型） */
  ctnCodeId: number;
  /** 价格 */
  price: number;
  /** 条件类型 */
  conditionType?: FreiPricePropType;
  /** 算符类型 */
  operatorType?: FreiPriceOperatorType;
  /** 要比较的值 */
  value?: number;
  /** 否则的价格 */
  otherPrice?: number;
}

/**
 * 运价箱型费用（编辑用）
 */
export interface SeFreiPriceCtnFeeEditDto {
  /** 子表主键ID（编辑时有值，新增时为空） */
  id?: string;
  /** 箱型ID（通过CtnCodeId关联对应的箱型） */
  ctnCodeId: number;
  /** 价格 */
  price: number;
  /** 条件类型 */
  conditionType?: FreiPricePropType;
  /** 算符类型 */
  operatorType?: FreiPriceOperatorType;
  /** 要比较的值 */
  value?: number;
  /** 否则的价格 */
  otherPrice?: number;
}

/**
 * 运价箱型费用（输出）
 */
export interface SeFreiPriceCtnFeeOutDto {
  /** 子表主键ID */
  id: string;
  /** 运价箱型ID */
  seFreiPriceCtnId: string;
  /** 运价费用ID */
  seFreiPriceFeeId: string;
  /** 价格 */
  price: number;
  /** 条件类型 */
  conditionType?: FreiPricePropType;
  /** 算符类型 */
  operatorType?: FreiPriceOperatorType;
  /** 要比较的值 */
  value?: number;
  /** 否则的价格 */
  otherPrice?: number;
}

/**
 * 运价箱型（新增用）
 */
export interface SeFreiPriceCtnAddDto {
  /** 箱型ID */
  ctnCodeId: number;
  /** 成本 */
  cost: number;
  /** 备注 */
  remark?: string;
}

/**
 * 运价箱型（编辑用）
 */
export interface SeFreiPriceCtnEditDto {
  /** 子表主键ID（编辑时有值，新增时为空） */
  id?: string;
  /** 箱型ID */
  ctnCodeId: number;
  /** 成本 */
  cost: number;
  /** 备注 */
  remark?: string;
}

/**
 * 运价箱型（输出）
 */
export interface SeFreiPriceCtnOutDto {
  /** 子表主键ID */
  id: string;
  /** 运价主表ID */
  seFreiPriceId: string;
  /** 箱型ID */
  ctnCodeId: number;
  /** 成本 */
  cost: number;
  /** 备注 */
  remark?: string;
  /** 箱型信息（关联对象） */
  ctnCode?: CtnCodeDto;
}

/**
 * 运价费用（新增用）
 */
export interface SeFreiPriceFeeAddDto {
  /** 费用代码ID */
  feeCodeId: number;
  /** 币别ID */
  currencyId: number;
  /** 运价箱型费用列表（每个箱型对应的价格） */
  seFreiPriceCtnFees?: SeFreiPriceCtnFeeAddDto[];
}

/**
 * 运价费用（编辑用）
 */
export interface SeFreiPriceFeeEditDto {
  /** 子表主键ID（编辑时有值，新增时为空） */
  id?: string;
  /** 费用代码ID */
  feeCodeId: number;
  /** 币别ID */
  currencyId: number;
  /** 运价箱型费用列表（每个箱型对应的价格） */
  seFreiPriceCtnFees?: SeFreiPriceCtnFeeEditDto[];
}

/**
 * 运价费用（输出）
 */
export interface SeFreiPriceFeeOutDto {
  /** 子表主键ID */
  id: string;
  /** 运价主表ID */
  seFreiPriceId: string;
  /** 费用代码ID */
  feeCodeId: number;
  /** 币别ID */
  currencyId: number;
  /** 费用代码信息（关联对象） */
  feeCode?: FeeCodeDto;
  /** 币别信息（关联对象） */
  currency?: CurrencyDto;
  /** 运价箱型费用列表（该费用下每个箱型对应的价格） */
  seFreiPriceCtnFees?: SeFreiPriceCtnFeeOutDto[];
}

/**
 * 运价详情（输出）
 */
export interface SeFreiPriceOutDto {
  /** 运价主键ID */
  id: string;
  /** 是否推荐 */
  recommend: boolean;
  /** 船公司ID */
  carrierId: number;
  /** 起运港ID */
  polId: number;
  /** 目的港ID */
  podId: number;
  /** 是否直达 */
  isDirect: boolean;
  /** 中转港1 ID */
  poT1Id?: number;
  /** 中转港2 ID */
  poT2Id?: number;
  /** 起运港免用箱天数 */
  polFreeDays?: number;
  /** 目的港免用箱天数 */
  podFreeDays?: number;
  /** 目的港免堆期天数 */
  poddem?: number;
  /** 目的港免箱期天数 */
  poddet?: number;
  /** 航程 */
  voyage?: string;
  /** 开船日期 */
  etd?: string;
  /** 开船日星期几 */
  etdDayOfWeek?: DayOfWeek;
  /** 开船日一天中的时间点 */
  etdDayTime?: string;
  /** 截单时间 */
  closeDocTime?: string;
  /** 截单日星期几 */
  closeDocDayOfWeek?: DayOfWeek;
  /** 截单时间一天中的时间点 */
  closeDocDayTime?: string;
  /** 截港时间/截关时间 */
  closingTime?: string;
  /** 截港日星期几 */
  closingDayOfWeek?: DayOfWeek;
  /** 截港时间一天中的时间点 */
  closingDayTime?: string;
  /** 有效时间起始 */
  validTimeStart: string;
  /** 有效时间截止 */
  validTimeEnd: string;
  /** 备注 */
  remark?: string;
  /** 币别ID */
  currencyId: number;
  /** 创建时间 */
  creationTime: string;
  /** 创建人ID */
  creatorUserId?: number;
  /** 最后修改时间 */
  lastModificationTime?: string;
  /** 最后修改人ID */
  lastModifierUserId?: number;
  /** 是否有效（根据有效时间截止与当前时间比较） */
  isValid: boolean;
  /** 船公司信息（关联对象） */
  carrier?: CarrierDto;
  /** 起运港信息（关联对象） */
  pol?: PortCodeDto;
  /** 目的港信息（关联对象） */
  pod?: PortCodeDto;
  /** 中转港1信息（关联对象） */
  poT1?: PortCodeDto;
  /** 中转港2信息（关联对象） */
  poT2?: PortCodeDto;
  /** 币别信息（关联对象） */
  currency?: CurrencyDto;
  /** 航线信息（关联对象） */
  lane?: LaneCodeDto;
  /** 国家信息（关联对象） */
  country?: CountryCodeDto;
  /** 箱型报价列表 */
  seFreiPriceCtns?: SeFreiPriceCtnOutDto[];
  /** 费用列表（含每个费用下的箱型费用） */
  seFreiPriceFees?: SeFreiPriceFeeOutDto[];
}

/**
 * 星期几枚举
 */
export enum DayOfWeek {
  /** 星期日 */
  Sunday = 0,
  /** 星期一 */
  Monday = 1,
  /** 星期二 */
  Tuesday = 2,
  /** 星期三 */
  Wednesday = 3,
  /** 星期四 */
  Thursday = 4,
  /** 星期五 */
  Friday = 5,
  /** 星期六 */
  Saturday = 6,
}

// ==================== 请求参数定义 ====================

/**
 * 新增运价请求
 */
export interface AddSeFreiPriceInput {
  /** 是否推荐 */
  recommend: boolean;
  /** 船公司ID */
  carrierId: number;
  /** 起运港ID */
  polId: number;
  /** 目的港ID */
  podId: number;
  /** 是否直达 */
  isDirect: boolean;
  /** 中转港1 ID */
  poT1Id?: number;
  /** 中转港2 ID */
  poT2Id?: number;
  /** 起运港免用箱天数 */
  polFreeDays?: number;
  /** 目的港免用箱天数 */
  podFreeDays?: number;
  /** 目的港免堆期天数 */
  poddem?: number;
  /** 目的港免箱期天数 */
  poddet?: number;
  /** 航程 */
  voyage?: string;
  /** 开船日期 */
  etd?: string;
  /** 开船日星期几 */
  etdDayOfWeek?: DayOfWeek;
  /** 开船日一天中的时间点 */
  etdDayTime?: string;
  /** 截单时间 */
  closeDocTime?: string;
  /** 截单日星期几 */
  closeDocDayOfWeek?: DayOfWeek;
  /** 截单时间一天中的时间点 */
  closeDocDayTime?: string;
  /** 截港时间/截关时间 */
  closingTime?: string;
  /** 截港日星期几 */
  closingDayOfWeek?: DayOfWeek;
  /** 截港时间一天中的时间点 */
  closingDayTime?: string;
  /** 有效时间起始 */
  validTimeStart: string;
  /** 有效时间截止 */
  validTimeEnd: string;
  /** 备注 */
  remark?: string;
  /** 币别ID */
  currencyId: number;
  /** 箱型报价列表 */
  seFreiPriceCtns?: SeFreiPriceCtnEditDto[];
  /** 费用列表 */
  seFreiPriceFees?: SeFreiPriceFeeEditDto[];
}

/**
 * 编辑运价请求
 */
export interface EditSeFreiPriceInput extends AddSeFreiPriceInput {
  /** 运价主键ID */
  id: string;
}

/**
 * 删除运价请求
 */
export interface DeleteSeFreiPriceInput {
  /** 单条删除的ID */
  id?: string;
  /** 批量删除的ID列表 */
  ids?: string[];
}

/**
 * 批量编辑运价请求
 */
export interface BatchEditSeFreiPriceInput {
  /** 要批量修改的运价ID列表 */
  ids?: string[];
  /** 是否推荐（为null不修改） */
  recommend?: boolean | null;
  /** 船公司ID（为null不修改） */
  carrierId?: number | null;
  /** 起运港ID（为null不修改） */
  polId?: number | null;
  /** 目的港ID（为null不修改） */
  podId?: number | null;
  /** 是否直达（为null不修改） */
  isDirect?: boolean | null;
  /** 中转港1 ID（为null不修改） */
  poT1Id?: number | null;
  /** 中转港2 ID（为null不修改） */
  poT2Id?: number | null;
  /** 起运港免用箱天数（为null不修改） */
  polFreeDays?: number | null;
  /** 目的港免用箱天数（为null不修改） */
  podFreeDays?: number | null;
  /** 目的港免堆期天数（为null不修改） */
  poddem?: number | null;
  /** 目的港免箱期天数（为null不修改） */
  poddet?: number | null;
  /** 航程（为null不修改） */
  voyage?: string | null;
  /** 开船日期（为null不修改） */
  etd?: string | null;
  /** 开船日星期几（为null不修改） */
  etdDayOfWeek?: DayOfWeek | null;
  /** 开船日一天中的时间点（为null不修改） */
  etdDayTime?: string | null;
  /** 截单时间（为null不修改） */
  closeDocTime?: string | null;
  /** 截单日星期几（为null不修改） */
  closeDocDayOfWeek?: DayOfWeek | null;
  /** 截单时间一天中的时间点（为null不修改） */
  closeDocDayTime?: string | null;
  /** 截港时间/截关时间（为null不修改） */
  closingTime?: string | null;
  /** 截港日星期几（为null不修改） */
  closingDayOfWeek?: DayOfWeek | null;
  /** 截港时间一天中的时间点（为null不修改） */
  closingDayTime?: string | null;
  /** 有效时间起始（为null不修改） */
  validTimeStart?: string | null;
  /** 有效时间截止（为null不修改） */
  validTimeEnd?: string | null;
  /** 备注（为null不修改） */
  remark?: string | null;
  /** 币别ID（为null不修改） */
  currencyId?: number | null;
  /** 箱型报价列表（不为空则删除原有子表重新添加） */
  seFreiPriceCtns?: SeFreiPriceCtnAddDto[];
  /** 费用列表（不为空则删除原有子表重新添加，含箱型费用） */
  seFreiPriceFees?: SeFreiPriceFeeAddDto[];
}

/**
 * 改变推荐状态请求
 */
export interface ChangeRecommendInput {
  /** 运价ID */
  id: string;
  /** 是否推荐 */
  recommend: boolean;
}

/**
 * 查询运价列表请求
 */
export interface GetSeFreiPriceListInput {
  /** 船公司ID筛选 */
  carrierId?: number;
  /** 起运港ID筛选 */
  polId?: number;
  /** 目的港ID筛选 */
  podId?: number;
  /** 是否推荐筛选 */
  recommend?: boolean;
  /** 目的港的国家ID筛选 */
  countryId?: number;
  /** 目的港的航线ID筛选 */
  laneId?: number;
  /** 是否有效筛选（根据有效时间截止与当前时间比较） */
  isValid?: boolean;
  /** 当前页码，默认1 */
  pageIndex?: number;
  /** 每页记录数，默认10 */
  pageSize?: number;
  /** 排序字段，默认"Id DESC" */
  sorting?: string;
}

/**
 * 获取所有航线结果
 */
export interface SeFreiPriceLaneCodesResultDto {
  /** 航线列表 */
  laneCodes?: LaneCodeDto[];
}

// ==================== API 接口定义 ====================

const BASE_URL = '/services/app/SeFreiPriceAdmin';

/**
 * 新增运价
 * @param data 新增运价数据
 * @returns 返回新增运价的ID（UUID字符串）
 */
export function addSeFreiPrice(data: AddSeFreiPriceInput) {
  return requestClient.post<string>(`${BASE_URL}/AddAsync`, data);
}

/**
 * 删除运价
 * @param data 删除参数（单条ID或批量ID列表）
 * @returns 返回删除结果
 */
export function deleteSeFreiPrice(data: DeleteSeFreiPriceInput) {
  return requestClient.delete<boolean>(`${BASE_URL}/DeleteAsync`, { data });
}

/**
 * 编辑运价
 * @param data 编辑运价数据
 * @returns 返回编辑结果
 */
export function editSeFreiPrice(data: EditSeFreiPriceInput) {
  return requestClient.put<boolean>(`${BASE_URL}/EditAsync`, data);
}

/**
 * 获取运价详情
 * @param id 运价ID
 * @returns 返回运价详细信息
 */
export function getSeFreiPriceDetail(id: string) {
  return requestClient.get<SeFreiPriceOutDto>(`${BASE_URL}/DetailAsync`, {
    params: { id },
  });
}

/**
 * 获取运价列表（分页）
 * @param params 查询参数
 * @returns 返回分页的运价列表
 */
export function getSeFreiPriceList(params: GetSeFreiPriceListInput) {
  return requestClient.get<{
    items: SeFreiPriceOutDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    skipCount: number;
    maxResultCount: number;
  }>(`${BASE_URL}/GetPagedListAsync`, { params });
}

/**
 * 获取所有航线（去重后的结果）
 * @returns 返回所有运价中目的港对应的航线列表
 */
export function getAllLaneCodes() {
  return requestClient.get<SeFreiPriceLaneCodesResultDto>(
    `${BASE_URL}/GetAllLaneCodesAsync`,
  );
}

/**
 * 批量编辑运价
 * @param data 批量编辑参数（所有字段可选，为null不修改该字段）
 * @returns 返回批量编辑结果
 */
export function batchEditSeFreiPrice(data: BatchEditSeFreiPriceInput) {
  return requestClient.put<boolean>(`${BASE_URL}/BatchEditAsync`, data);
}

/**
 * 改变推荐状态
 * @param data 推荐状态参数
 * @returns 返回操作结果
 */
export function changeRecommendStatus(data: ChangeRecommendInput) {
  return requestClient.put<boolean>(`${BASE_URL}/ChangeRecommendAsync`, data);
}

/**
 * 批量新增运价（简化版，仅包含箱型成本）
 * @param data 批量新增运价数据列表
 * @returns 返回新增运价的ID列表（UUID字符串数组）
 */
export function batchAddSimpleSeFreiPrice(data: SeFreiPriceSimpleAddDto[]) {
  return requestClient.post<string[]>(`${BASE_URL}/BatchAddSimpleAsync`, data);
}

/**
 * 运价简单新增DTO（仅主表+箱型，不含费用）
 */
export interface SeFreiPriceSimpleAddDto {
  /** 是否推荐 */
  recommend: boolean;
  /** 船公司ID */
  carrierId: number;
  /** 起运港ID */
  polId: number;
  /** 目的港ID */
  podId: number;
  /** 是否直达 */
  isDirect: boolean;
  /** 中转港1 ID */
  poT1Id?: number;
  /** 中转港2 ID */
  poT2Id?: number;
  /** 起运港免用箱天数 */
  polFreeDays?: number;
  /** 目的港免用箱天数 */
  podFreeDays?: number;
  /** 目的港免堆期天数 */
  poddem?: number;
  /** 目的港免箱期天数 */
  poddet?: number;
  /** 航程 */
  voyage?: string;
  /** 开船日期 */
  etd?: string;
  /** 开船日星期几 */
  etdDayOfWeek?: DayOfWeek;
  /** 开船日一天中的时间点 */
  etdDayTime?: string;
  /** 截单时间 */
  closeDocTime?: string;
  /** 截单日星期几 */
  closeDocDayOfWeek?: DayOfWeek;
  /** 截单时间一天中的时间点 */
  closeDocDayTime?: string;
  /** 截港时间/截关时间 */
  closingTime?: string;
  /** 截港日星期几 */
  closingDayOfWeek?: DayOfWeek;
  /** 截港时间一天中的时间点 */
  closingDayTime?: string;
  /** 有效时间起始 */
  validTimeStart: string;
  /** 有效时间截止 */
  validTimeEnd: string;
  /** 备注 */
  remark?: string;
  /** 币别ID */
  currencyId: number;
  /** 箱型报价列表 */
  seFreiPriceCtns?: SeFreiPriceCtnAddDto[];
}

/**
 * 运价简单编辑DTO（仅主表+箱型，不含费用）
 */
export interface SeFreiPriceSimpleEditDto {
  /** 运价主键ID */
  id: string;
  /** 是否推荐 */
  recommend: boolean;
  /** 船公司ID */
  carrierId: number;
  /** 起运港ID */
  polId: number;
  /** 目的港ID */
  podId: number;
  /** 是否直达 */
  isDirect: boolean;
  /** 中转港1 ID */
  poT1Id?: number;
  /** 中转港2 ID */
  poT2Id?: number;
  /** 起运港免用箱天数 */
  polFreeDays?: number;
  /** 目的港免用箱天数 */
  podFreeDays?: number;
  /** 目的港免堆期天数 */
  poddem?: number;
  /** 目的港免箱期天数 */
  poddet?: number;
  /** 航程 */
  voyage?: string;
  /** 开船日期 */
  etd?: string;
  /** 开船日星期几 */
  etdDayOfWeek?: DayOfWeek;
  /** 开船日一天中的时间点 */
  etdDayTime?: string;
  /** 截单时间 */
  closeDocTime?: string;
  /** 截单日星期几 */
  closeDocDayOfWeek?: DayOfWeek;
  /** 截单时间一天中的时间点 */
  closeDocDayTime?: string;
  /** 截港时间/截关时间 */
  closingTime?: string;
  /** 截港日星期几 */
  closingDayOfWeek?: DayOfWeek;
  /** 截港时间一天中的时间点 */
  closingDayTime?: string;
  /** 有效时间起始 */
  validTimeStart: string;
  /** 有效时间截止 */
  validTimeEnd: string;
  /** 备注 */
  remark?: string;
  /** 币别ID */
  currencyId: number;
  /** 箱型报价列表 */
  seFreiPriceCtns?: SeFreiPriceCtnEditDto[];
}

/**
 * 批量简单编辑运价
 * @param data 批量简单编辑运价数据列表（仅主表+箱型，不含费用）
 * @returns 返回批量编辑结果
 */
export function batchEditSimpleSeFreiPrice(data: SeFreiPriceSimpleEditDto[]) {
  return requestClient.put<boolean>(`${BASE_URL}/BatchEditSimpleAsync`, data);
}

/**
 * 获取批量运价的箱型列表（去重）
 * @param ids 运价ID列表
 */
export function GetCtnCodesByPriceIdsAsync(ids: string[]) {
  return requestClient.post<CtnCodeDto[]>(
    `${BASE_URL}/GetCtnCodesByPriceIdsAsync`,
    { ids },
  );
}
