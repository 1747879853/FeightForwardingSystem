/**
 * 空运出口详情 <-> 表单 的纯数据映射层，外加四个派生值的计算规则。
 *
 * 只做数据转换，不依赖任何 Vue 响应式 / 组件 API，便于独立测试与复用。
 *
 * 与海运的结构差异：
 * - 货物明细 `airExportOrderCtns` 挂在空运出口这一层，不在 `transportOrder` 下；
 * - 起运地 / 中转地 / 目的地是空运港口对象，只有三字码与中英文名称；
 * - 界面上的「起飞日期 / 实际起飞日期 / 预抵日期」对应 `etd` / `atd` / `eta`。
 */
import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import dayjs from 'dayjs';

import { VOLUME_WEIGHT_FACTOR } from '../data';

/** 派生值统一保留 6 位小数 */
const DECIMAL_SCALE = 6;

/** 宽松转数字：空值/非法值返回 undefined */
export const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** 校验是否为有效用户 ID（正整数） */
export const hasValidUserId = (value: unknown) => {
  const parsed = toOptionalNumber(value);
  return parsed != null && parsed > 0;
};

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
export const toDayjs = (val: null | string | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 业务主表的四个日期保存时截断到天 */
export const toDateOnlyString = (val: unknown) => {
  if (val === null || val === undefined) return undefined;
  const d = dayjs(val as Date | string);
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined;
};

const round6 = (value: number) =>
  Number.parseFloat(value.toFixed(DECIMAL_SCALE));

/** 单件体积 CBM = 长 × 宽 × 高 ÷ 1000000（厘米 → 立方米），任一为空则留空 */
export const calcCtnCbm = (
  length: unknown,
  width: unknown,
  height: unknown,
): number | undefined => {
  const l = toOptionalNumber(length);
  const w = toOptionalNumber(width);
  const h = toOptionalNumber(height);
  if (l === undefined || w === undefined || h === undefined) return undefined;
  return round6((l * w * h) / 1_000_000);
};

/** 整行体积重 = 单件体积 × 167 × 件数，体积或件数为空则留空 */
export const calcVolumeWeight = (
  cbm: unknown,
  pkgs: unknown,
): number | undefined => {
  const volume = toOptionalNumber(cbm);
  const count = toOptionalNumber(pkgs);
  if (volume === undefined || count === undefined) return undefined;
  return round6(volume * VOLUME_WEIGHT_FACTOR * count);
};

/** 向上进位到 0.5 千克的整数倍：12.1 → 12.5，12.5 → 12.5，12.6 → 13 */
export const ceilToHalfKg = (value: number) => round6(Math.ceil(value * 2) / 2);

/**
 * 整行计费重 = max(体积重, 单件重量 × 件数) 后按 0.5 千克向上进位。
 * 两个都算不出来 → 留空；只算得出一个 → 取算得出的那个再进位。
 */
export const calcChargeWeight = (
  volumeWeight: unknown,
  kgs: unknown,
  pkgs: unknown,
): number | undefined => {
  const volume = toOptionalNumber(volumeWeight);
  const unitWeight = toOptionalNumber(kgs);
  const count = toOptionalNumber(pkgs);
  const actualWeight =
    unitWeight === undefined || count === undefined
      ? undefined
      : unitWeight * count;
  const candidates = [volume, actualWeight].filter(
    (item): item is number => item !== undefined,
  );
  if (candidates.length === 0) return undefined;
  return ceilToHalfKg(Math.max(...candidates));
};

/** 泡比 = 整票毛重 ÷ 整票体积；毛重或体积为空、体积为 0 时留空（不要写 0） */
export const calcBubbleRatio = (
  kgs: unknown,
  cbm: unknown,
): number | undefined => {
  const weight = toOptionalNumber(kgs);
  const volume = toOptionalNumber(cbm);
  if (weight === undefined || volume === undefined || volume === 0) {
    return undefined;
  }
  return round6(weight / volume);
};

/** 明细行合计（体积重 / 计费重）：全为空时返回 undefined */
export const sumCtnDecimal = (
  items: Array<Record<string, unknown>> | undefined,
  field: string,
): number | undefined => {
  if (!items?.length) return undefined;
  let hasValue = false;
  let total = 0;
  for (const item of items) {
    const value = toOptionalNumber(item?.[field]);
    if (value !== undefined) {
      hasValue = true;
      total += value;
    }
  }
  return hasValue ? round6(total) : undefined;
};

/** 将详情 DTO 扁平化为各子表单可直接 setValues 的键值对 */
export const flattenDetail = (
  detail: AirExportAdminApi.AirExportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  return {
    // 空运出口层
    bookingAgentId: detail.bookingAgentId,
    flightNo: detail.flightNo,
    polId: detail.polId ?? undefined,
    polRemark: detail.polRemark,
    potId: detail.potId ?? undefined,
    potRemark: detail.potRemark,
    podId: detail.podId ?? undefined,
    podRemark: detail.podRemark,
    bubbleRatio: detail.bubbleRatio ?? undefined,
    customsDeclareDate: toDayjs(detail.customsDeclareDate),
    deliveryWarehouseDate: toDayjs(detail.deliveryWarehouseDate),
    sortId: detail.sortId,
    orgId: detail.orgId ?? undefined,
    organizationUnitsText:
      detail.orgs
        ?.map((item) => item?.name)
        .filter((name): name is string => !!name)
        .join('、') || '-',

    // 业务主表层
    commissionNum: to?.commissionNum,
    inputType: to?.inputType,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    codeSourceId: to?.codeSourceId ?? undefined,
    codeServiceId: to?.codeServiceId ?? undefined,
    isBusinessLocking: to?.isBusinessLocking,
    isUnfinished: to?.isUnfinished,
    feeLocked: to?.feeLocked,
    mblNum: to?.mblNum,
    contractNum: to?.contractNum,
    internalRemark: to?.internalRemark,
    remark: to?.remark,
    marks: to?.marks,
    goodsDes: to?.goodsDes,
    pkgs: to?.pkgs,
    upperPKGS: to?.upperPKGS,
    codePackageId: to?.codePackageId ?? undefined,
    kgs: to?.kgs,
    cbm: to?.cbm,
    cargoId: to?.cargoId,
    goodsCompleteTime: toDayjs(to?.goodsCompleteTime),
    /** 界面上的「起飞日期」 */
    etd: toDayjs(to?.etd),
    /** 界面上的「实际起飞日期」 */
    atd: toDayjs(to?.atd),
    /** 界面上的「预抵日期」 */
    eta: toDayjs(to?.eta),
    clientId: to?.clientId,
    teamId: to?.teamId,
    custBrokerId: to?.custBrokerId,
    warehouseId: to?.warehouseId,
    insuranceId: to?.insuranceId,
    consigneeId: to?.consigneeId,
    consigneeContent: to?.consigneeContent,
    shipperId: to?.shipperId,
    shipperContent: to?.shipperContent,
    notifierId: to?.notifierId,
    notifierContent: to?.notifierContent,
    orderCodeGoodss: (to?.orderCodeGoodss ?? [])
      .map((item) => item?.codeGoodsId)
      .filter((id) => id !== undefined && id !== null),
    orderUsers: to?.orderUsers ?? [],
    dgLevel: to?.dgLevel,
    dgNo: to?.dgNo,
    dgPageNo: to?.dgPageNo,
    dgLabel: to?.dgLabel,
    dgPackingCategory: to?.dgPackingCategory,
    dgContact: to?.dgContact,
    dgTel: to?.dgTel,
    dgNetWeight: to?.dgNetWeight,
    dgFlashPoint: to?.dgFlashPoint,
    dgPackingNo: to?.dgPackingNo,
    dgMarinePollution: to?.dgMarinePollution,
    reeferTemperature: to?.reeferTemperature,
    reeferVentilation: to?.reeferVentilation,
    reeferHumidity: to?.reeferHumidity,
    reeferMinTemperature: to?.reeferMinTemperature,
    reeferMaxTemperature: to?.reeferMaxTemperature,
    reeferTemperatureUnit: to?.reeferTemperatureUnit ?? undefined,
    reeferVentOpen: to?.reeferVentOpen,
  };
};

/**
 * 为货物明细每项添加 `_rowKey` 供表格使用。
 * 主键是可空 Guid，新增行没有主键，行 key 必须由前端自己维护。
 */
export const normalizeOrderCtnsWithRowKey = (
  items: AirExportAdminApi.AirExportOrderCtnEditDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `air_ctn_${i}_${Date.now()}`,
  })) as any[];
};

const ORDER_CTN_API_KEYS: Array<
  Extract<keyof AirExportAdminApi.AirExportOrderCtnEditDto, string>
> = [
  'id',
  'pkgs',
  'kgs',
  'length',
  'width',
  'height',
  'cbm',
  'volumeWeight',
  'chargeWeight',
  'sortId',
];

const ORDER_USER_API_KEYS: Array<
  Extract<keyof AirExportAdminApi.OrderUserAddDto, string>
> = ['userId', 'userAttribute', 'sortId', 'remark'];

/**
 * 提交时移除 `_rowKey` 等非 API 字段，并按行序重排 sortId。
 *
 * 已有行保留主键表示更新，新增行不带主键（**不能传全零 Guid**，会被当成传了主键后静默丢弃）。
 * SortId 必须唯一且连续，否则相同 SortId 之间只能按 Guid 主键兜底排序，行序会乱。
 */
export const sanitizeOrderCtns = (
  items: any[] | undefined,
): AirExportAdminApi.AirExportOrderCtnEditDto[] => {
  if (!items?.length) return [];
  return items.map((item, index) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      if (key === 'sortId') continue;
      const val = item[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val === '') continue;
        dto[key] = val;
      }
    }
    dto.sortId = index + 1;
    return dto as AirExportAdminApi.AirExportOrderCtnEditDto;
  });
};

/** 提交时移除 userNickName 等非 API 字段，仅保留 OrderUserAddDto 字段 */
export const sanitizeOrderUsers = (
  items: any[] | undefined,
): AirExportAdminApi.OrderUserAddDto[] => {
  if (!items?.length) return [];
  return items
    .map((item) => {
      const dto: Record<string, any> = {};
      for (const key of ORDER_USER_API_KEYS) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          if (typeof val === 'string' && val === '') continue;
          dto[key] = val;
        }
      }
      return dto as AirExportAdminApi.OrderUserAddDto;
    })
    .filter((item) => hasValidUserId(item.userId));
};

/**
 * 从 id + name 构建 select 组件的 selectedItems，
 * 避免每个 select 组件单独调详情接口回显。
 */
export const toSelectedItems = (
  id: any,
  name: any,
  labelKey = 'name',
  extra: Record<string, any> = {},
) => {
  if (id === null || id === undefined) return [];
  return [{ id, [labelKey]: name || '', ...extra }] as any[];
};

/** AirPortSelect 回显：组件按 iataCode / cnName / enName 自行拼展示文案 */
export const toAirPortSelectedItems = (
  port?: AirExportAdminApi.AirPortSimpleDto | null,
) => {
  if (!port?.id) return [];
  return [
    {
      id: port.id,
      iataCode: port.iataCode ?? '',
      cnName: port.cnName ?? '',
      enName: port.enName ?? '',
    },
  ] as any[];
};
