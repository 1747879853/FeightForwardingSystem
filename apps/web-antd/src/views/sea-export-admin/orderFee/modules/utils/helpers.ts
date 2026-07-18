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
    return transportOrder.clientName || null;
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
    return transportOrder.teamName || null;
  }

  // 报关行
  if (
    transportOrder?.custBrokerId &&
    String(transportOrder.custBrokerId) === settlementIdStr
  ) {
    return transportOrder.custBrokerName || null;
  }

  // 仓库
  if (
    transportOrder?.warehouseId &&
    String(transportOrder.warehouseId) === settlementIdStr
  ) {
    return transportOrder.warehouseName || null;
  }

  // 保险公司
  if (
    transportOrder?.insuranceId &&
    String(transportOrder.insuranceId) === settlementIdStr
  ) {
    return transportOrder.insuranceName || null;
  }

  return null;
};
