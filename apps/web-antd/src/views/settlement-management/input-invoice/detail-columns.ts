import type { InputInvoiceAdminApi } from '#/api/settlement-management/input-invoice-admin';

import {
  getFavouredPolicyLabel,
  getIncludeTaxLabel,
  getLinePropertyLabel,
  getZeroTaxRateFlagLabel,
} from './constants';

/**
 * 进项发票详情里 9 类嵌套数组的表格列配置。
 * 用 [标题, 字段, 可选渲染] 元组批量构列，保持紧凑。
 */

type Render = (value: any) => string;

const col = (
  title: string,
  dataIndex: string,
  render?: Render,
  width?: number,
): Record<string, any> => ({
  title,
  dataIndex,
  width,
  ellipsis: true,
  customRender: render ? ({ text }: any) => render(text) : undefined,
});

/** 税率（小数）→ 百分比 */
const rateRender: Render = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : `${(num * 100).toFixed(2)}%`;
};

/** 商品明细（items） */
export const itemColumns = [
  col('序号', 'detailIndex', undefined, 60),
  col('商品名称', 'itemName', undefined, 180),
  col('规格型号', 'itemSpec', undefined, 120),
  col('单位', 'itemUnit', undefined, 60),
  col('税收分类编码', 'itemCode', undefined, 140),
  col('数量', 'itemNum', undefined, 80),
  col('单价(含税)', 'itemPrice', undefined, 100),
  col('不含税单价', 'itemTaxFreePrice', undefined, 100),
  col('不含税金额', 'itemAmount', undefined, 110),
  col('税额', 'itemTaxAmount', undefined, 90),
  col('价税合计', 'itemTotalAmount', undefined, 110),
  col('税率', 'itemTaxRate', rateRender, 80),
  col('扣除额', 'itemDeductAmount', undefined, 90),
  col('零税率标识', 'zeroTaxRateFlag', getZeroTaxRateFlagLabel, 100),
  col('优惠政策名称', 'zeroTaxRateDesc', undefined, 140),
  col('行性质', 'invoiceLineProperty', getLinePropertyLabel, 90),
  col('优惠政策标识', 'favouredPolicyFlag', getFavouredPolicyLabel, 120),
  col('含税标识', 'isIncludeTax', getIncludeTaxLabel, 90),
  col('通行日期起', 'transitDateStart', undefined, 110),
  col('通行日期止', 'transitDateEnd', undefined, 110),
];

/** 建筑服务（buildingInfoItems） */
export const buildingColumns = [
  col('明细行号', 'detailIndex', undefined, 90),
  col('发票流水号', 'invoiceId', undefined, 160),
  col('建筑服务发生地', 'address', undefined, 160),
  col('发生地详细地址', 'detailAddress', undefined, 200),
  col('建筑项目名称', 'itemName', undefined, 180),
  col('土地增值税项目编号', 'itemCode', undefined, 180),
  col(
    '跨地市标志',
    'crossCity',
    (v) => (v === '1' ? '是' : v === '0' ? '否' : '-'),
    100,
  ),
];

/** 货物运输（goodsTransportItems） */
export const goodsTransportColumns = [
  col('明细行号', 'detailIndex', undefined, 90),
  col('发票流水号', 'invoiceId', undefined, 160),
  col('起运地', 'departure', undefined, 140),
  col('到达地', 'destination', undefined, 140),
  col('运输工具种类', 'transportTool', undefined, 130),
  col('运输工具牌号', 'transportBrand', undefined, 130),
  col('运输货物名称', 'itemName', undefined, 180),
];

/** 不动产销售（immovableSellItems） */
export const immovableSellColumns = [
  col('明细行号', 'detailIndex', undefined, 90),
  col('发票流水号', 'invoiceId', undefined, 160),
  col('产权证书号', 'certificate', undefined, 160),
  col('不动产地址', 'address', undefined, 160),
  col('不动产详细地址', 'detailAddress', undefined, 200),
  col('不动产单元代码', 'contractNum', undefined, 180),
  col('土地增值税项目编号', 'itemCode', undefined, 180),
  col('核定计税价格', 'approvedAmount', undefined, 130),
  col('实际成交含税金额', 'transactionAmount', undefined, 150),
  col(
    '跨地市标志',
    'crossCity',
    (v) => (v === 1 ? '是' : v === 0 ? '否' : '-'),
    100,
  ),
  col('面积单位', 'unit', undefined, 90),
];

/** 不动产租赁（immovableRentItems） */
export const immovableRentColumns = [
  col('明细行号', 'detailIndex', undefined, 90),
  col('发票流水号', 'invoiceId', undefined, 160),
  col('产权证书号', 'certificate', undefined, 160),
  col('不动产地址', 'address', undefined, 160),
  col('不动产详细地址', 'detailAddress', undefined, 200),
  col('租赁期起', 'rentStart', undefined, 120),
  col('租赁期止', 'rentEnd', undefined, 120),
  col(
    '跨地市标志',
    'crossCity',
    (v) => (v === 1 ? '是' : v === 0 ? '否' : '-'),
    100,
  ),
  col('面积单位', 'unit', undefined, 90),
];

/** 旅客运输（travellerTransportItems） */
export const travellerColumns = [
  col('明细行号', 'detailIndex', undefined, 90),
  col('发票流水号', 'invoiceId', undefined, 160),
  col('出行人', 'traveller', undefined, 100),
  col('证件类型', 'cardType', undefined, 110),
  col('有效身份证号', 'cardNo', undefined, 180),
  col('出行日期', 'travelDate', undefined, 120),
  col('出发地', 'departure', undefined, 130),
  col('到达地', 'destination', undefined, 130),
  col('交通工具类型', 'vehicleType', undefined, 130),
  col('等级', 'vehicleLevel', undefined, 90),
];

/** 铁路电子客票（railwayTicketItems） */
export const railwayColumns = [
  col('明细行号', 'detailIndex', undefined, 90),
  col('出行人', 'traveller', undefined, 100),
  col('有效身份证号', 'cardNo', undefined, 180),
  col('出发地', 'departure', undefined, 120),
  col('到达地', 'destination', undefined, 120),
  col('出行车次', 'toolsNumber', undefined, 100),
  col('乘车日期', 'boardingDate', undefined, 120),
  col('出发时间', 'departureTime', undefined, 100),
  col('车厢', 'carriage', undefined, 80),
  col('电子客票号', 'ticketNo', undefined, 150),
  col('空调特征', 'airFeatures', undefined, 100),
  col('席别', 'seatType', undefined, 90),
  col('席位', 'seat', undefined, 90),
  col(
    '业务类型',
    'bizType',
    (v) => (v === 1 ? '售' : v === 2 ? '退' : '-'),
    90,
  ),
];

/** 航空票发票明细（airInvoiceItems，字段均为字符串） */
export const airItemColumns = [
  col('明细序号', 'detailIndex', undefined, 90),
  col('商品名称', 'itemName', undefined, 160),
  col('规格型号', 'itemSpec', undefined, 120),
  col('单位', 'itemUnit', undefined, 60),
  col('商品编码', 'itemCode', undefined, 140),
  col('数量', 'itemNum', undefined, 80),
  col('单价', 'itemPrice', undefined, 90),
  col('不含税单价', 'itemTaxFreePrice', undefined, 110),
  col('不含税金额', 'itemAmount', undefined, 110),
  col('税率', 'itemTaxRate', undefined, 80),
  col('税额', 'itemTaxAmount', undefined, 90),
  col('价税合计', 'itemTotalAmount', undefined, 110),
  col('扣除额', 'itemDeductAmount', undefined, 90),
  col('零税率标识', 'zeroTaxRateFlag', undefined, 100),
  col('优惠政策名称', 'zeroTaxRateDesc', undefined, 140),
  col('行性质', 'invoiceLineProperty', undefined, 90),
  col('优惠政策标识', 'favouredPolicyFlag', undefined, 120),
];

/** 航空票航段（airSegments） */
export const airSegmentColumns = [
  col('序号', 'detailIndex', undefined, 70),
  col('始发站', 'departureStation', undefined, 110),
  col('目的地', 'destinationStation', undefined, 110),
  col('航段', 'flightSegment', undefined, 100),
  col('承运人', 'carrier', undefined, 90),
  col('航班号', 'flight', undefined, 90),
  col('座位等级', 'seatClass', undefined, 100),
  col('承运日期', 'carrierDate', undefined, 120),
  col('起飞时间', 'departureTime', undefined, 100),
  col('客票级别', 'fareBasis', undefined, 100),
  col('客票生效日', 'effectiveDate', undefined, 120),
  col('有效截止日期', 'expirationDate', undefined, 120),
  col('免费行李额', 'freeBaggageAllowance', undefined, 110),
];

/** 一张嵌套表：标题 + 列 + 数据 */
export interface NestedTable {
  key: string;
  title: string;
  columns: Record<string, any>[];
  data: Record<string, any>[];
}

/**
 * 按详情数据挑出「非空」的嵌套数组表（商品明细 + 8 类特定业务）。
 * 无数据的票种不渲染对应表，避免一堆空表。
 */
export function buildNestedTables(
  detail: InputInvoiceAdminApi.InputInvoiceDetailDto,
): NestedTable[] {
  const defs: {
    key: string;
    title: string;
    columns: Record<string, any>[];
    data?: any[];
  }[] = [
    {
      key: 'items',
      title: '商品明细',
      columns: itemColumns,
      data: detail.items,
    },
    {
      key: 'building',
      title: '建筑服务',
      columns: buildingColumns,
      data: detail.buildingInfoItems,
    },
    {
      key: 'goodsTransport',
      title: '货物运输',
      columns: goodsTransportColumns,
      data: detail.goodsTransportItems,
    },
    {
      key: 'immovableSell',
      title: '不动产销售',
      columns: immovableSellColumns,
      data: detail.immovableSellItems,
    },
    {
      key: 'immovableRent',
      title: '不动产租赁',
      columns: immovableRentColumns,
      data: detail.immovableRentItems,
    },
    {
      key: 'traveller',
      title: '旅客运输',
      columns: travellerColumns,
      data: detail.travellerTransportItems,
    },
    {
      key: 'railway',
      title: '铁路电子客票',
      columns: railwayColumns,
      data: detail.railwayTicketItems,
    },
    {
      key: 'airItem',
      title: '航空票发票明细',
      columns: airItemColumns,
      data: detail.airInvoiceItems,
    },
    {
      key: 'airSegment',
      title: '航空票航段',
      columns: airSegmentColumns,
      data: detail.airSegments,
    },
  ];

  return defs
    .filter((item) => Array.isArray(item.data) && item.data.length > 0)
    .map((item) => ({
      key: item.key,
      title: item.title,
      columns: item.columns,
      data: item.data as Record<string, any>[],
    }));
}
