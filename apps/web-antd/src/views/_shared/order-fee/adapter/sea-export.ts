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
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
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

/** 订单信息展示字段配置（海运出口） */
const displayFields: DisplayFieldConfig[] = [
  { key: 'mblNum', label: $t('seaExport.export.mblNum'), visible: true },
  {
    key: 'bookingNum',
    label: $t('seaExport.export.bookingNum'),
    visible: true,
  },
  {
    key: 'receivePortName',
    label: $t('seaExport.export.receivePortId'),
    visible: true,
  },
  { key: 'polName', label: $t('seaExport.export.polId'), visible: true },
  { key: 'poT1Name', label: $t('seaExport.export.poT1Id'), visible: true },
  { key: 'poT2Name', label: $t('seaExport.export.poT2Id'), visible: true },
  { key: 'podName', label: $t('seaExport.export.podId'), visible: true },
  {
    key: 'deliverPortName',
    label: $t('seaExport.export.deliverPortId'),
    visible: true,
  },
  {
    key: 'codeSourceName',
    label: $t('seaExport.export.codeSourceId'),
    visible: true,
  },
  {
    key: 'commissionNum',
    label: $t('seaExport.export.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('seaExport.export.clientId'), visible: true },
  { key: 'teamName', label: $t('seaExport.export.teamId'), visible: true },
  { key: 'vessel', label: $t('seaExport.export.vessel'), visible: true },
  {
    key: 'innerVoyno',
    label: $t('seaExport.export.innerVoyno'),
    visible: true,
  },
  {
    key: 'carrierName',
    label: $t('seaExport.export.carrierId'),
    visible: true,
  },
  { key: 'etd', label: $t('seaExport.export.etd'), visible: true },
  { key: 'atd', label: $t('seaExport.export.atd'), visible: true },
  { key: 'eta', label: $t('seaExport.export.eta'), visible: true },
  {
    key: 'closeDocTime',
    label: $t('seaExport.export.closeDocTime'),
    visible: true,
  },
  {
    key: 'closeVgmTime',
    label: $t('seaExport.export.closeVgmTime'),
    visible: true,
  },
  {
    key: 'closeManifestTime',
    label: $t('seaExport.export.closeManifestTime'),
    visible: true,
  },
  {
    key: 'codeServiceName',
    label: $t('seaExport.export.codeServiceId'),
    visible: true,
  },
  {
    key: 'codeFrtName',
    label: $t('seaExport.export.codeFrtId'),
    visible: true,
  },
  { key: 'noPkgs', label: $t('seaExport.export.noPkgs'), visible: true },
  { key: 'kgs', label: $t('seaExport.export.kgs'), visible: true },
  { key: 'cbm', label: $t('seaExport.export.cbm'), visible: true },
  { key: 'goodsDes', label: $t('seaExport.export.goodsDes'), visible: true },
];

/** 订单信息展示字段取值（海运出口） */
const getDisplayValue = (fieldKey: string, detail: any, to: any) => {
  switch (fieldKey) {
    case 'mblNum':
      return to?.mblNum || '--';
    case 'bookingNum':
      return to?.bookingNum || '--';
    case 'receivePortName':
      return detail?.receivePortRemark || '--';
    case 'polName':
      return detail?.polRemark || '--';
    case 'poT1Name':
      return detail?.poT1Remark || '--';
    case 'poT2Name':
      return detail?.poT2Remark || '--';
    case 'podName':
      return detail?.podRemark || '--';
    case 'deliverPortName':
      return detail?.deliverPortRemark || '--';
    case 'codeSourceName':
      return to?.codeSourceName || '--';
    case 'commissionNum':
      return to?.commissionNum || '--';
    case 'clientName':
      return to?.client?.name || '--';
    case 'teamName':
      return to?.team?.name || '--';
    case 'vessel':
      return detail?.vessel || '--';
    case 'innerVoyno':
      return detail?.innerVoyno || '--';
    case 'carrierName':
      return detail?.carrier?.cnShortName || detail?.carrier?.cnName || '--';
    case 'etd':
      return formatNormalDate(to?.etd, 'YYYY-MM-DD');
    case 'atd':
      return formatNormalDate(to?.atd, 'YYYY-MM-DD');
    case 'eta':
      return formatNormalDate(to?.eta, 'YYYY-MM-DD');
    case 'closingTime':
      return formatNormalDate(detail?.closingTime);
    case 'closeVgmTime':
      return formatNormalDate(detail?.closeVgmTime);
    case 'closeDocTime':
      return formatNormalDate(detail?.closeDocTime);
    case 'closeManifestTime':
      return formatNormalDate(detail?.closeManifestTime);
    case 'signingTime':
      return formatNormalDate(detail?.signingTime);
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

/** 海运出口费用录入适配器 */
export const seaExportAdapter: OrderFeeModuleAdapter = {
  module: 'sea-export',
  bizType: 0,
  i18nPrefix: 'seaExport.export',
  dataI18nPrefix: 'seaExport.export',
  clientI18nModule: 'seaExport',
  displayFields,
  getDisplayValue,
  printBizType: PrintFormatBizType.SeaExport,
  api: {
    getDetail: getSeaExportDetail,
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
