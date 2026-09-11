import dayjs from 'dayjs';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import {
  getInvoiceStatusOptions,
  getFeeStatusOptions as getFeeStatusOptionsFromData,
  getDataEntryMethodOptions,
} from '../../data';

/**
 * 根据费用代码ID获取显示标签
 */
export const getFeeCodeLabel = (
  feeCodeId: any,
  feeCodeList: FeeCodeAdminApi.FeeCodeDto[],
): string => {
  if (!feeCodeId) return '';
  const item = feeCodeList.find(
    (f) => f.id === feeCodeId || String(f.id) === String(feeCodeId),
  );
  if (!item) return '';
  const surLabel = item.cnName || item.enName || '';
  return item.code ? `${item.code}-${surLabel}` : surLabel;
};

/**
 * 根据行业类别值获取显示标签
 */
export const getIndustryCategoryLabel = (
  industryCategory: any,
  industryCategoryList: Array<{ label: string; value: any }>,
): string => {
  if (!industryCategory) return '';
  const option = industryCategoryList.find(
    (opt) => opt.value === industryCategory,
  );
  return option?.label || '';
};

/**
 * 根据币种ID获取显示标签
 */
export const getCurrencyLabel = (
  currencyId: any,
  currencyList: Array<{ label: string; value: any }>,
): string => {
  if (!currencyId) return '';
  const currencyIdStr = String(currencyId);
  const option = currencyList.find(
    (opt) => String(opt.value) === currencyIdStr,
  );
  return option?.label || '';
};

/**
 * 根据结算对象ID获取显示标签
 */
export const getSettlementLabel = (
  settlementId: any,
  dataSource: any[],
): string => {
  if (!settlementId) return '';

  for (const row of dataSource) {
    const rowAny = row as any;
    if (String(rowAny.settlementId) === String(settlementId)) {
      if (rowAny.__settlementName) {
        return rowAny.__settlementName;
      }
    }
  }

  return String(settlementId);
};

/**
 * 根据开票状态值获取显示标签
 */
export const getInvoiceStatusLabel = (invoiceStatus: any): string => {
  if (invoiceStatus === undefined || invoiceStatus === null) return '';
  const option = getInvoiceStatusOptions().find(
    (opt) => opt.value === invoiceStatus,
  );
  return option?.label || String(invoiceStatus);
};

/**
 * 根据费用状态值获取显示标签
 */
export const getFeeStatusLabel = (feeStatus: any): string => {
  if (feeStatus === undefined || feeStatus === null) return '';
  const option = getFeeStatusOptionsFromData().find(
    (opt) => opt.value === feeStatus,
  );
  return option?.label || String(feeStatus);
};

/**
 * 根据数据录入方式值获取显示标签
 */
export const getDataEntryMethodLabel = (dataEntryMethod: any): string => {
  if (dataEntryMethod === undefined || dataEntryMethod === null) return '';
  const option = getDataEntryMethodOptions().find(
    (opt) => opt.value === dataEntryMethod,
  );
  return option?.label || String(dataEntryMethod);
};

/**
 * 格式化日期时间显示
 */
export const formatDateTime = (dateValue: any): string => {
  if (!dateValue) return '';
  try {
    return dayjs(dateValue).format('YYYY-MM-DD HH:mm:ss');
  } catch {
    return String(dateValue);
  }
};

/**
 * 从订单详情中提取结算对象名称
 */
export const extractSettlementNameFromOrder = (
  settlementId: any,
  orderBaseData: any,
): string | null => {
  if (!settlementId || !orderBaseData) {
    return null;
  }

  const settlementIdStr = String(settlementId);
  const orderDetail = orderBaseData;
  const transportOrder = orderDetail.transportOrder;

  // 委托单位（主要客户）
  if (
    transportOrder?.clientId &&
    String(transportOrder.clientId) === settlementIdStr
  ) {
    return transportOrder.client?.name || null;
  }

  // 发货人
  if (
    transportOrder?.shipperId &&
    String(transportOrder.shipperId) === settlementIdStr
  ) {
    try {
      const shipperContent = JSON.parse(transportOrder.shipperContent || '{}');
      return shipperContent.name || shipperContent.cnName || null;
    } catch {
      // 解析失败，继续尝试其他字段
    }
  }

  // 收货人
  if (
    transportOrder?.consigneeId &&
    String(transportOrder.consigneeId) === settlementIdStr
  ) {
    try {
      const consigneeContent = JSON.parse(
        transportOrder.consigneeContent || '{}',
      );
      return consigneeContent.name || consigneeContent.cnName || null;
    } catch {
      // 解析失败，继续尝试其他字段
    }
  }

  // 通知人
  if (
    transportOrder?.notifierId &&
    String(transportOrder.notifierId) === settlementIdStr
  ) {
    try {
      const notifierContent = JSON.parse(
        transportOrder.notifierContent || '{}',
      );
      return notifierContent.name || notifierContent.cnName || null;
    } catch {
      // 解析失败，继续尝试其他字段
    }
  }

  // 第二通知人
  if (
    orderDetail.secondNotifierId &&
    String(orderDetail.secondNotifierId) === settlementIdStr
  ) {
    return orderDetail.secondNotifier?.name || null;
  }

  // 目的港代理
  if (
    orderDetail.podAgentId &&
    String(orderDetail.podAgentId) === settlementIdStr
  ) {
    return orderDetail.podAgent?.name || null;
  }

  // 订舱代理
  if (
    orderDetail.bookingAgentId &&
    String(orderDetail.bookingAgentId) === settlementIdStr
  ) {
    return orderDetail.bookingAgent?.name || null;
  }

  // 船代
  if (
    orderDetail.shipAgentId &&
    String(orderDetail.shipAgentId) === settlementIdStr
  ) {
    return orderDetail.shipAgent?.name || null;
  }

  // 场站
  if (orderDetail.yardId && String(orderDetail.yardId) === settlementIdStr) {
    return orderDetail.yard?.name || null;
  }

  // 车队
  if (
    transportOrder?.teamId &&
    String(transportOrder.teamId) === settlementIdStr
  ) {
    return transportOrder.team?.name || null;
  }

  // 报关行
  if (
    transportOrder?.custBrokerId &&
    String(transportOrder.custBrokerId) === settlementIdStr
  ) {
    return transportOrder.custBroker?.name || null;
  }

  // 仓库
  if (
    transportOrder?.warehouseId &&
    String(transportOrder.warehouseId) === settlementIdStr
  ) {
    return transportOrder.warehouse?.name || null;
  }

  // 保险公司
  if (
    transportOrder?.insuranceId &&
    String(transportOrder.insuranceId) === settlementIdStr
  ) {
    return transportOrder.insurance?.name || null;
  }

  return null;
};

/**
 * 税率是否已设置（含 0；null/undefined/空串视为未设置）
 */
export function isTaxRateSet(value: unknown): value is number {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return !Number.isNaN(n);
}

/**
 * 费用行税率：优先结算对象税率，否则费用名称（费用代码）税率
 */
export function resolveFeeTaxRate(
  settlementTaxRate?: null | number,
  feeCodeTaxRate?: null | number,
): number | undefined {
  if (isTaxRateSet(settlementTaxRate)) return Number(settlementTaxRate);
  if (isTaxRateSet(feeCodeTaxRate)) return Number(feeCodeTaxRate);
  return undefined;
}

/**
 * 从按行业类别缓存的客户列表中取结算对象税率
 * - 未找到客户 → undefined
 * - 找到客户 → 返回其 taxRate（可能为 null）
 */
export function findClientTaxRateFromCache(
  settlementId: unknown,
  allClientsByIndustry?: Record<string, Array<any>>,
): null | number | undefined {
  if (
    settlementId === null ||
    settlementId === undefined ||
    settlementId === '' ||
    !allClientsByIndustry
  ) {
    return undefined;
  }
  const idStr = String(settlementId);
  for (const clients of Object.values(allClientsByIndustry)) {
    if (!clients?.length) continue;
    const matched = clients.find(
      (c) => String(c.value) === idStr || String(c.id) === idStr,
    );
    if (matched) {
      return matched.taxRate ?? null;
    }
  }
  return undefined;
}

/**
 * 空数据时 Handsontable 往往不会按列宽累加内容总宽（scrollWidth≈视口），
 * 表现为：横滚拖动只裁切表头、松手滚动条回弹。强制把 master/clone 的
 * wtHider/wtSpreader 撑到列宽之和，使真实横向滚动生效。
 */
export function ensureEmptyTableHorizontalScroll(hot: any) {
  if (!hot?.rootElement || hot.isDestroyed) return;

  const targets = hot.rootElement.querySelectorAll(
    '.wtHider, .wtSpreader',
  ) as NodeListOf<HTMLElement>;

  if (hot.countRows() > 0) {
    targets.forEach((el) => {
      if (el.style.minWidth) el.style.minWidth = '';
    });
    return;
  }

  const colCount = hot.countCols();
  if (colCount <= 0) return;

  let total = 0;
  for (let i = 0; i < colCount; i++) {
    total += Number(hot.getColWidth(i)) || 100;
  }
  // 列边框约 1px
  total += colCount;

  const minWidth = `${total}px`;
  targets.forEach((el) => {
    el.style.minWidth = minWidth;
  });
}
