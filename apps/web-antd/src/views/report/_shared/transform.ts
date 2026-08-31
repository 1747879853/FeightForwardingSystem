import type { ReportApi } from '#/api/system/report';

import type { CurrencyFieldDef } from './types';

import {
  formatBizType,
  formatBlType,
  formatCtns,
  formatTeu,
  safeFormatDate,
} from './formatters';

/**
 * 报表行数据转换
 * 将后端返回的报表 DTO 转换为 Handsontable 所需的扁平行数据
 */

/** 业务线字段提取结果 */
interface BizLineFields {
  pol: ReportApi.SeaAirPortSimpleDto | null;
  pod: ReportApi.SeaAirPortSimpleDto | null;
  polRemark: string;
  podRemark: string;
  vessel: string;
  innerVoyno: string;
  carrier: ReportApi.CarrierSimpleDto | null;
  blType: number | null | undefined;
}

/**
 * 从业务主单中提取业务线字段
 * 按海运出口 > 海运进口 > 空运出口的优先级取值
 */
function extractBizLineFields(
  transportOrder: ReportApi.ReportTransportOrderDto | null | undefined,
): BizLineFields {
  const fields: BizLineFields = {
    pol: null,
    pod: null,
    polRemark: '',
    podRemark: '',
    vessel: '',
    innerVoyno: '',
    carrier: null,
    blType: null,
  };

  if (!transportOrder) return fields;

  const { seaExport, seaImport, airExport } = transportOrder;
  if (seaExport) {
    fields.pol = seaExport.pol;
    fields.pod = seaExport.pod;
    fields.polRemark = seaExport.polRemark || '';
    fields.podRemark = seaExport.podRemark || '';
    fields.vessel = seaExport.vessel || '';
    fields.innerVoyno = seaExport.innerVoyno || '';
    fields.carrier = seaExport.carrier;
    fields.blType = seaExport.blType;
  } else if (seaImport) {
    fields.pol = seaImport.pol;
    fields.pod = seaImport.pod;
    fields.polRemark = seaImport.polRemark || '';
    fields.podRemark = seaImport.podRemark || '';
    fields.vessel = seaImport.vessel || '';
    fields.innerVoyno = seaImport.innerVoyno || '';
    fields.carrier = seaImport.carrier;
    // 海运进口/空运出口 DTO 未声明 blType，运行时存在则兜底读取
    fields.blType = (seaImport as any)?.blType;
  } else if (airExport) {
    fields.pol = airExport.pol;
    fields.pod = airExport.pod;
    fields.polRemark = airExport.polRemark || '';
    fields.podRemark = airExport.podRemark || '';
    fields.carrier = null;
    fields.blType = (airExport as any)?.blType;
  }

  return fields;
}

/** 报表行数据通用结构（各报表共有的行级字段） */
interface ReportRowItem {
  transportOrderId: string;
  changeOrderId?: string;
  isOriginal: boolean;
  accountDate: string;
  transportOrder: ReportApi.ReportTransportOrderDto;
  currencies: { currency: ReportApi.CurrencySimpleDto }[];
  /** 合计金额的计量单位，取主单所属公司的本位币；跨公司查询时各行可能不同 */
  localCurrencyCode?: null | string;
}

/**
 * 构建公共行数据（各报表共有的字段）
 */
function buildCommonRow(item: ReportRowItem): Record<string, any> {
  const transportOrder = item.transportOrder;
  const biz = extractBizLineFields(transportOrder);
  const { carrier } = biz;

  return {
    transportOrderId: item.transportOrderId,
    changeOrderId: item.changeOrderId,
    isOriginal: item.isOriginal,
    accountDate: safeFormatDate(item.accountDate, 'month'),
    bizType: formatBizType(transportOrder?.bizType ?? 0),
    client: transportOrder?.client?.name || '-',
    mblNum: transportOrder?.mblNum || '',
    commissionNum: transportOrder?.commissionNum || '',
    bizDate: safeFormatDate(transportOrder?.bizDate, 'date'),
    settlementDate: safeFormatDate(transportOrder?.settlementDate, 'date'),
    cargoId: transportOrder?.cargoId,
    settlementType: transportOrder?.settlementType,
    pkgs: transportOrder?.pkgs,
    kgs: transportOrder?.kgs,
    cbm: transportOrder?.cbm,
    sales: (transportOrder?.sales || []).map((u: any) => u.nickName).join(', '),
    operations: (transportOrder?.operations || [])
      .map((u: any) => u.nickName)
      .join(', '),
    pol: biz.pol ? biz.pol.code : '-',
    pod: biz.pod ? biz.pod.code : '-',
    polRemark: biz.polRemark,
    podRemark: biz.podRemark,
    vessel: biz.vessel,
    innerVoyno: biz.innerVoyno,
    // 船公司显示英文简称（如 CMA、MSK），优先取 EDI 代码
    carrier: carrier ? carrier.ediCode || carrier.code || carrier.enName : '-',
    ctns: formatCtns(transportOrder?.ctns || []),
    teu: formatTeu(transportOrder?.ctns || []),
    blType: formatBlType(biz.blType),
    // 组织机构只显示所属公司（公司节点），无公司节点时回退第一个组织
    org:
      (transportOrder?.orgs || []).find((o) => o.isCompany)?.name ||
      (transportOrder?.orgs || [])[0]?.name ||
      '-',
    localCurrencyCode: item.localCurrencyCode || '',
    _originalData: item,
    _isDataRow: true,
  };
}

/**
 * 收集列表中所有出现的币别代码
 */
function collectCurrencyCodes(list: ReportRowItem[]): Set<string> {
  const codes = new Set<string>();
  list.forEach((item) => {
    item.currencies?.forEach((curr) => {
      if (curr.currency?.code) {
        codes.add(curr.currency.code);
      }
    });
  });
  return codes;
}

/**
 * 按币别字段定义展开币别金额列
 * 金额为 0 时显示空字符串，与原实现保持一致
 */
function applyCurrencyAmounts(
  row: Record<string, any>,
  currencies: { currency: ReportApi.CurrencySimpleDto }[] | undefined,
  currencyCodes: string[],
  fields: CurrencyFieldDef[],
) {
  // 先初始化所有币别列为空字符串
  currencyCodes.forEach((code) => {
    fields.forEach((field) => {
      row[`${code}_${field.key}`] = '';
    });
  });

  currencies?.forEach((curr) => {
    if (!curr.currency?.code) return;
    const code = curr.currency.code;
    fields.forEach((field) => {
      const value = (curr as any)[field.key];
      const formatted = (value || 0).toFixed(2);
      row[`${code}_${field.key}`] = formatted === '0.00' ? '' : formatted;
    });
  });
}

/**
 * 将后端报表数据转换为表格行数据
 * @param list 后端返回的报表数据列表
 * @param currencyFields 币别明细列定义
 * @param mapExtraRow 报表特有行字段映射（可选）
 * @returns 转换后的行数据与币别代码集合
 */
export function transformReportData<TRaw extends ReportRowItem>(
  list: TRaw[],
  currencyFields: CurrencyFieldDef[],
  mapExtraRow?: (item: TRaw) => Record<string, any>,
): { currencyCodes: Set<string>; rows: Record<string, any>[] } {
  const currencyCodes = collectCurrencyCodes(list);
  const sortedCodes = Array.from(currencyCodes).sort();

  const rows = list.map((item) => {
    const row: Record<string, any> = {
      ...buildCommonRow(item),
      ...(mapExtraRow?.(item) ?? {}),
    };
    applyCurrencyAmounts(row, item.currencies, sortedCodes, currencyFields);
    return row;
  });

  return { rows, currencyCodes };
}
