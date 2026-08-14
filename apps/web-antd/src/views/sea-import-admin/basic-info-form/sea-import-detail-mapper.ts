/**
 * 海运进口详情 <-> 表单 的纯数据映射层。
 *
 * 只做数据转换，不依赖任何 Vue 响应式 / 组件 API，便于独立测试与复用。
 *
 * 与海运出口的两处结构差异：
 * - `orderCtns` 挂在海运进口这一层，不在 `transportOrder` 下；
 * - 航线 / 国家没有独立字段，从 `pol.lane` 与 `pol.country` 读。
 */
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import dayjs from 'dayjs';

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

/** 提交时 dayjs/日期 转回日期字符串（精度到天，进口所有日期均为纯日期） */
export const toDateOnlyString = (val: unknown) => {
  if (val === null || val === undefined) return undefined;
  const d = dayjs(val as Date | string);
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined;
};

/** 将详情 DTO 扁平化为各子表单可直接 setValues 的键值对 */
export const flattenDetail = (
  detail: SeaImportAdminApi.SeaImportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  return {
    // 海运进口层
    vessel: detail.vessel,
    innerVoyno: detail.innerVoyno,
    carrierId: detail.carrierId,
    polId: detail.polId,
    polRemark: detail.polRemark,
    podId: detail.podId,
    podRemark: detail.podRemark,
    clientNum: detail.clientNum,
    terminalId: detail.terminalId,
    throughBillNum: detail.throughBillNum,
    hblNum: detail.hblNum,
    tradeMode: detail.tradeMode,
    invoiceNum: detail.invoiceNum,
    batchNum: detail.batchNum,
    originCountryId: detail.originCountryId,
    totalNetWeight: detail.totalNetWeight,
    exchangeBillDate: toDayjs(detail.exchangeBillDate),
    pickUpDate: toDayjs(detail.pickUpDate),
    customsDeclareDate: toDayjs(detail.customsDeclareDate),
    // 转站/箱使为只读文本，表单里存 YYYY-MM-DD 字符串
    transferStationDate: toDateOnlyString(detail.transferStationDate) ?? '',
    freeDays: detail.freeDays,
    ctnUseDate: toDateOnlyString(detail.ctnUseDate) ?? '',
    sortId: detail.sortId,
    orgId: detail.orgId ?? undefined,
    organizationUnitsText:
      detail.orgs
        ?.map((item) => item?.name)
        .filter((name): name is string => !!name)
        .join('、') || '-',
    // 航线与国家只读，来自起运港
    laneName: detail.pol?.lane?.laneName ?? '',
    countryName: detail.pol?.country?.countryName ?? '',

    // 业务主表层
    commissionNum: to?.commissionNum,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    codeSourceId: to?.codeSourceId,
    codeServiceId: to?.codeServiceId,
    isBusinessLocking: to?.isBusinessLocking,
    isUnfinished: to?.isUnfinished,
    feeLocked: to?.feeLocked,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    contractNum: to?.contractNum,
    internalRemark: to?.internalRemark,
    remark: to?.remark,
    marks: to?.marks,
    goodsDes: to?.goodsDes,
    pkgs: to?.pkgs,
    upperPKGS: to?.upperPKGS,
    codePackageId: to?.codePackageId,
    kgs: to?.kgs,
    cbm: to?.cbm,
    cargoId: to?.cargoId,
    /** 界面上的「到港日期」 */
    etd: toDayjs(to?.etd),
    clientId: to?.clientId,
    clientContactId: to?.clientContactId,
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
    /** 保留商品子表行 id，编辑全量比对时回传 */
    orderCodeGoodsRows: (to?.orderCodeGoodss ?? [])
      .filter(
        (item) => item?.codeGoodsId !== undefined && item?.codeGoodsId !== null,
      )
      .map((item) => ({
        id: item.id,
        codeGoodsId: item.codeGoodsId,
      })),
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
    reeferTemperatureUnit: to?.reeferTemperatureUnit,
    reeferVentOpen: to?.reeferVentOpen,
  };
};

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用；并把关联对象名摊平到本地回显字段 */
export const normalizeOrderCtnsWithRowKey = (
  items:
    | Array<
        SeaImportAdminApi.OrderCtnDto & {
          codePackageName?: null | string;
          ctnCodeName?: null | string;
        }
      >
    | SeaImportAdminApi.OrderCtnDto[]
    | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => {
    const local = item as SeaImportAdminApi.OrderCtnDto & {
      codeGoodsModelName?: null | string;
      codeGoodsName?: null | string;
      codeGoodsSpecName?: null | string;
      codePackageName?: null | string;
      ctnCodeName?: null | string;
    };
    return {
      ...item,
      // AI 抽取可能只带本地名、无关联对象；详情回填优先对象名
      ctnCodeName: item.ctnCode?.ctnName || local.ctnCodeName,
      codePackageName: item.codePackage?.name || local.codePackageName,
      codeGoodsName: item.codeGoods?.name || local.codeGoodsName,
      codeGoodsSpecName: item.codeGoodsSpec?.name || local.codeGoodsSpecName,
      codeGoodsModelName: item.codeGoodsModel?.name || local.codeGoodsModelName,
      _rowKey: `ctn_${i}_${Date.now()}`,
    };
  }) as any[];
};

/** 编辑时带上 id 表示更新，进口比出口多 codeGoodsSpecId / codeGoodsModelId / netWeight */
const ORDER_CTN_API_KEYS: Array<
  Extract<keyof SeaImportAdminApi.OrderCtnEditDto, string>
> = [
  'id',
  'ctnCodeId',
  'ctnNo',
  'sealNo',
  'pkgs',
  'codePackageId',
  'grossWeight',
  'tareWeight',
  'netWeight',
  'overLength',
  'overWidth',
  'overHeight',
  'volume',
  'codeGoodsId',
  'codeGoodsSpecId',
  'codeGoodsModelId',
  'bookingNo',
  'remark',
];

const ORDER_USER_API_KEYS: Array<
  Extract<keyof SeaImportAdminApi.OrderUserAddDto, string>
> = ['id', 'userId', 'userAttribute', 'sortId', 'remark'];

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnEditDto 字段 */
export const sanitizeOrderCtns = (
  items: any[] | undefined,
): SeaImportAdminApi.OrderCtnEditDto[] => {
  if (!items?.length) return [];
  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val === '') continue;
        dto[key] = val;
      }
    }
    return dto as SeaImportAdminApi.OrderCtnEditDto;
  });
};

/** 提交时移除 userNickName 等非 API 字段，仅保留 OrderUserAddDto 字段 */
export const sanitizeOrderUsers = (
  items: any[] | undefined,
): SeaImportAdminApi.OrderUserAddDto[] => {
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
      return dto as SeaImportAdminApi.OrderUserAddDto;
    })
    .filter((item) => hasValidUserId(item.userId));
};

/**
 * 商品多选 id 列表 → 提交行：尽量复用详情里的行 id，避免编辑时全量删建。
 */
export const buildOrderCodeGoodsSubmitRows = (
  selectedIds: Array<number | string> | undefined,
  existingRows:
    | Array<{ codeGoodsId?: number | string; id?: number | string }>
    | undefined,
): SeaImportAdminApi.OrderCodeGoodsAddDto[] => {
  const ids = (selectedIds ?? []).filter(
    (codeGoodsId) => codeGoodsId !== undefined && codeGoodsId !== null,
  );
  if (!ids.length) return [];
  const idByGoodsId = new Map<string, number | string>();
  for (const row of existingRows ?? []) {
    if (row?.codeGoodsId === undefined || row?.codeGoodsId === null) continue;
    if (
      row.id === undefined ||
      row.id === null ||
      row.id === '' ||
      row.id === 0
    )
      continue;
    idByGoodsId.set(String(row.codeGoodsId), row.id);
  }
  return ids.map((codeGoodsId) => {
    const existingId = idByGoodsId.get(String(codeGoodsId));
    return existingId === undefined
      ? { codeGoodsId }
      : { id: existingId, codeGoodsId };
  });
};

/** 净重 = 毛重 − 皮重，任一缺失则不计算 */
export const calcCtnNetWeight = (
  grossWeight: unknown,
  tareWeight: unknown,
): number | undefined => {
  const gross = toOptionalNumber(grossWeight);
  const tare = toOptionalNumber(tareWeight);
  if (gross === undefined || tare === undefined) return undefined;
  return Number.parseFloat((gross - tare).toFixed(2));
};

/** 净重合计 = 各集装箱净重求和；全部为空时返回 undefined，避免把 0 写回表单 */
export const sumCtnNetWeight = (
  items: Array<{ netWeight?: unknown }> | undefined,
): number | undefined => {
  if (!items?.length) return undefined;
  let hasValue = false;
  let total = 0;
  for (const item of items) {
    const value = toOptionalNumber(item?.netWeight);
    if (value !== undefined) {
      hasValue = true;
      total += value;
    }
  }
  return hasValue ? Number.parseFloat(total.toFixed(2)) : undefined;
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

/** PortSelect 回显：portName + ediCode（labelKey 为 ediCode 时展示依赖 ediCode），countryEnName 可选 */
export const toPortSelectedItems = (
  id: unknown,
  portName: unknown,
  ediCode?: unknown,
  countryEnName?: unknown,
) => {
  const extra: Record<string, unknown> = {};
  if (
    ediCode !== null &&
    ediCode !== undefined &&
    String(ediCode).trim() !== ''
  ) {
    extra.ediCode = String(ediCode).trim();
  }
  if (
    countryEnName !== null &&
    countryEnName !== undefined &&
    String(countryEnName).trim() !== ''
  ) {
    extra.country = { countryEnName: String(countryEnName).trim() };
  }
  return toSelectedItems(id, portName, 'portName', extra);
};

/** 业务主表平铺名 / 对象名双读 */
export const resolveCodeSourceName = (
  to: SeaImportAdminApi.TransportOrderDto | null | undefined,
) => to?.codeSourceName || to?.codeSource?.cnName || '';

export const resolveCodeServiceName = (
  to: SeaImportAdminApi.TransportOrderDto | null | undefined,
) => to?.codeServiceName || to?.codeService?.cnName || '';

export const resolveCodePackageName = (
  to: SeaImportAdminApi.TransportOrderDto | null | undefined,
) => to?.codePackageName || to?.codePackage?.name || '';
