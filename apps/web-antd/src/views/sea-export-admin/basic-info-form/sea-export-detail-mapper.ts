/**
 * 海运出口详情 <-> 表单 的纯数据映射层。
 *
 * 本文件只做数据转换，不依赖任何 Vue 响应式 / 组件 API，便于独立测试与复用。
 * 从 form.vue 抽出，减轻单文件体量。
 */
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

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
export const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 提交时 dayjs/日期 转回 ISO 字符串 */
export const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

/** 提交时 dayjs/日期 转回日期字符串（精度到天） */
export const toDateOnlyString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined;
};

/** 将详情 DTO 扁平化为各子表单可直接 setValues 的键值对 */
export const flattenDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  const prepareAtId = to?.prepareAtId ?? (detail as any)?.prepareAtId;
  return {
    // 海运出口界面航线/国家取自目的港（与海运进口取自起运港不同）
    countryName: detail.pod?.country?.countryName ?? '',
    laneName: detail.pod?.lane?.laneName ?? '',
    blType: detail.blType,
    billType: detail.billType,
    codeIssueTypeId: (detail as any).codeIssueTypeId ?? detail.issueType,
    vessel: detail.vessel,
    innerVoyno: detail.innerVoyno,
    terminalVoyno: detail.terminalVoyno,
    carrierId: detail.carrierId,
    secondNotifierId: detail.secondNotifierId,
    secondNotifierContent: detail.secondNotifierContent,
    podAgentId: detail.podAgentId,
    podAgentContent: detail.podAgentContent,
    bookingAgentId: detail.bookingAgentId,
    shipAgentId: detail.shipAgentId,
    yardId: detail.yardId,
    yardContact: detail.yardContact,
    yardEmail: detail.yardEmail,
    yardMobile: detail.yardMobile,
    yardTel: detail.yardTel,
    noBillEnum: detail.noBillEnum,
    copyNoBillEnum: detail.copyNoBillEnum,
    goodsCompleteTime: toDayjs(
      to?.goodsCompleteTime ?? (detail as any).goodsCompleteTime,
    ),
    etd: toDayjs(to?.etd ?? (detail as any).etd),
    atd: toDayjs(to?.atd ?? (detail as any).atd),
    eta: toDayjs(to?.eta ?? (detail as any).eta),
    closingTime: toDayjs(detail.closingTime),
    closeVgmTime: toDayjs(detail.closeVgmTime),
    closeDocTime: toDayjs(detail.closeDocTime),
    closeManifestTime: toDayjs(detail.closeManifestTime),
    signingTime: toDayjs(detail.signingTime),
    sortId: detail.sortId,
    remark: to?.remark,
    commissionNum: to?.commissionNum,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    contractNum: to?.contractNum,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    orgId: detail.orgId ?? undefined,
    organizationUnitsText:
      detail.orgs
        ?.map((item) => item?.name)
        .filter((name): name is string => !!name)
        .join('、') || '-',
    codeSourceId: to?.codeSourceId,
    isBusinessLocking: to?.isBusinessLocking,
    feeLocked: to?.feeLocked,
    codeFrtId: to?.codeFrtId,
    prepareAtId,
    codeServiceId: to?.codeServiceId,
    cargoId: to?.cargoId,
    tradeTermsType: to?.tradeTermsType,
    polId: detail.polId,
    polRemark: detail.polRemark,
    podId: detail.podId,
    podRemark: detail.podRemark,
    poT1Id: detail.poT1Id,
    poT1Remark: detail.poT1Remark,
    poT2Id: detail.poT2Id,
    poT2Remark: detail.poT2Remark,
    receivePortId: detail.receivePortId,
    receivePortRemark: detail.receivePortRemark,
    deliverPortId: detail.deliverPortId,
    deliverPortRemark: detail.deliverPortRemark,
    signingPortId: detail.signingPortId,
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
    marks: to?.marks,
    pkgs: to?.pkgs,
    codePackageId: to?.codePackageId,
    goodsDes: to?.goodsDes,
    kgs: to?.kgs,
    cbm: to?.cbm,
    internalRemark: to?.internalRemark,
    orderCodeGoodss: (to?.orderCodeGoodss ?? [])
      .map((item: any) => item?.codeGoodsId)
      .filter((id: any) => id !== undefined && id !== null),
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

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
export const normalizeOrderCtnsWithRowKey = (
  items: SeaExportAdminApi.OrderCtnAddDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `ctn_${i}_${Date.now()}`,
  })) as any[];
};

const ORDER_CTN_API_KEYS: Array<
  Extract<keyof SeaExportAdminApi.OrderCtnAddDto, string>
> = [
  'ctnCodeId',
  'ctnNo',
  'sealNo',
  'pkgs',
  'codePackageId',
  'grossWeight',
  'tareWeight',
  'overLength',
  'overWidth',
  'overHeight',
  'volume',
  'codeGoodsId',
  'bookingNo',
  'remark',
];

const ORDER_USER_API_KEYS: Array<
  Extract<keyof SeaExportAdminApi.OrderUserAddDto, string>
> = ['userId', 'userAttribute', 'sortId', 'remark'];

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
export const sanitizeOrderCtns = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderCtnAddDto[] => {
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
    return dto as SeaExportAdminApi.OrderCtnAddDto;
  });
};

/** 提交时移除 userName 等非 API 字段，仅保留 OrderUserAddDto 字段 */
export const sanitizeOrderUsers = (
  items: any[] | undefined,
): SeaExportAdminApi.OrderUserAddDto[] => {
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
      return dto as SeaExportAdminApi.OrderUserAddDto;
    })
    .filter((item) => hasValidUserId(item.userId));
};

/**
 * 从 id + name 构建 select 组件的 selectedItems，
 * 避免每个 select 组件单独调详情接口回显。
 * @param labelKey 对应 select 组件的回显字段，如 ClientSelect 用 'name'，PortSelect 用 'portName'
 */
export const toSelectedItems = (
  id: any,
  name: any,
  labelKey = 'name',
  extra: Record<string, any> = {},
) => {
  if (id == null) return [];
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
  if (ediCode != null && String(ediCode).trim() !== '') {
    extra.ediCode = String(ediCode).trim();
  }
  if (countryEnName != null && String(countryEnName).trim() !== '') {
    extra.country = { countryEnName: String(countryEnName).trim() };
  }
  return toSelectedItems(id, portName, 'portName', extra);
};

/**
 * 由港口对象（PortCodeSimpleDtoForOrder）构建 PortSelect 的 selectedItems。
 * 展开整个港口对象（含 portName/cnName/ediCode/country/lane），
 * 回显字段齐全时 PortSelect 不再二次拉取港口详情。
 * 无对象时退化为 id 占位项，仍由组件懒加载详情兜底。
 */
export const toPortObjectSelectedItems = <T extends { id?: unknown }>(
  port: T | null | undefined,
  fallbackId?: unknown,
) => {
  const id = port?.id ?? fallbackId;
  if (id == null) return [];
  if (!port) return [{ id, portName: '' }] as any[];
  return [{ ...port, id }] as any[];
};
