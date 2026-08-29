import dayjs from 'dayjs';

import { $t } from '#/locales';

import { PrintFormatBizType } from '#/components/print-format';

import {
  getOrderFeePagedList,
  getOrderFeeCount,
  getTransportOrderFees,
  importOrderFeesToTransportOrder,
  batchEditOrderFee,
  batchDeleteOrderFee,
  generateOppositeOrderFees,
} from '#/api/sea-export/order-fee-admin';
import { GetDetail } from '#/api/sea-export/change-order-admin';
import { getAirExportDetail } from '#/api/air-export/air-export-admin';
import {
  changeIsUnfinishedAsync,
  getIsFinishedAsync,
} from '#/api/sea-export/fee-lock-admin';

import type { DisplayFieldConfig, OrderFeeModuleAdapter } from '../types';

const formatNormalDate = (val: any, format = 'YYYY-MM-DD HH:mm') => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

/** 订单信息展示字段配置（空运出口） */
const displayFields: DisplayFieldConfig[] = [
  { key: 'mawbNum', label: $t('airExport.export.mawbNum'), visible: true },
  {
    key: 'bookingNum',
    label: $t('airExport.export.bookingNum'),
    visible: true,
  },
  {
    key: 'receivePortName',
    label: $t('airExport.export.receivePortId'),
    visible: true,
  },
  { key: 'polName', label: $t('airExport.export.polId'), visible: true },
  { key: 'podName', label: $t('airExport.export.podId'), visible: true },
  {
    key: 'deliverPortName',
    label: $t('airExport.export.deliverPortId'),
    visible: true,
  },
  {
    key: 'codeSourceName',
    label: $t('airExport.export.codeSourceId'),
    visible: true,
  },
  {
    key: 'commissionNum',
    label: $t('airExport.export.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('airExport.export.clientId'), visible: true },
  { key: 'teamName', label: $t('airExport.export.teamId'), visible: true },
  { key: 'flightNo', label: $t('airExport.export.flightNo'), visible: true },
  {
    key: 'carrierName',
    label: $t('airExport.export.carrierId'),
    visible: true,
  },
  { key: 'etd', label: $t('airExport.export.etd'), visible: true },
  { key: 'atd', label: $t('airExport.export.atd'), visible: true },
  { key: 'eta', label: $t('airExport.export.eta'), visible: true },
  {
    key: 'closeDocTime',
    label: $t('airExport.export.closeDocTime'),
    visible: true,
  },
  {
    key: 'codeServiceName',
    label: $t('airExport.export.codeServiceId'),
    visible: true,
  },
  {
    key: 'codeFrtName',
    label: $t('airExport.export.codeFrtId'),
    visible: true,
  },
  { key: 'noPkgs', label: $t('airExport.export.noPkgs'), visible: true },
  { key: 'kgs', label: $t('airExport.export.kgs'), visible: true },
  { key: 'cbm', label: $t('airExport.export.cbm'), visible: true },
  { key: 'goodsDes', label: $t('airExport.export.goodsDes'), visible: true },
];

/** 订单信息展示字段取值（空运出口） */
const getDisplayValue = (fieldKey: string, detail: any, to: any) => {
  switch (fieldKey) {
    case 'mawbNum':
      return to?.mawbNum || '--';
    case 'bookingNum':
      return to?.bookingNum || '--';
    case 'receivePortName':
      return detail?.receivePortRemark || '--';
    case 'polName':
      return detail?.polRemark || '--';
    case 'podName':
      return detail?.podRemark || '--';
    case 'deliverPortName':
      return detail?.deliverPortRemark || '--';
    case 'codeSourceName':
      return to?.codeSource?.cnName || '--';
    case 'commissionNum':
      return to?.commissionNum || '--';
    case 'clientName':
      return to?.client?.name || '--';
    case 'teamName':
      return to?.team?.name || '--';
    case 'flightNo':
      return detail?.flightNo || '--';
    case 'carrierName':
      return detail?.carrier?.cnShortName || detail?.carrier?.cnName || '--';
    case 'etd':
      return formatNormalDate(to?.etd, 'YYYY-MM-DD');
    case 'atd':
      return formatNormalDate(to?.atd, 'YYYY-MM-DD');
    case 'eta':
      return formatNormalDate(to?.eta, 'YYYY-MM-DD');
    case 'closeDocTime':
      return formatNormalDate(detail?.closeDocTime);
    case 'codeServiceName':
      return detail?.codeServiceName || '--';
    case 'codeFrtName':
      return detail?.codeFrtName || '--';
    case 'noPkgs':
      return to?.noPkgs || '--';
    case 'kgs':
      return to?.kgs || '--';
    case 'cbm':
      return to?.cbm || '--';
    case 'goodsDes':
      return to?.goodsDes || '--';
    default:
      return '--';
  }
};

/** 空运出口费用录入适配器 */
export const airExportAdapter: OrderFeeModuleAdapter = {
  module: 'air-export',
  bizType: 2,
  i18nPrefix: 'airExport.export',
  // AE 现状：data.ts 与海出完全一致（airExport.export.orderFee 仅有 32 键，不足以覆盖全部列文案）
  dataI18nPrefix: 'seaExport.export',
  clientI18nModule: 'seaExport',
  displayFields,
  getDisplayValue,
  printBizType: PrintFormatBizType.AirExport,
  api: {
    getDetail: getAirExportDetail,
    getChangeOrderDetail: GetDetail,
    getOrderFeePagedList,
    getOrderFeeCount,
    getTransportOrderFees,
    importOrderFeesToTransportOrder,
    batchEditOrderFee,
    batchDeleteOrderFee,
    generateOppositeOrderFees,
    getIsFinishedAsync,
    changeIsUnfinishedAsync,
  },
};
