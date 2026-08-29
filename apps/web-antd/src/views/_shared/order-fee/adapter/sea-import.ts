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
} from '#/api/sea-import/order-fee-admin';
import { GetDetail } from '#/api/sea-import/change-order-admin';
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import {
  changeIsUnfinishedAsync,
  getIsFinishedAsync,
} from '#/api/sea-import/fee-lock-admin';

import type { DisplayFieldConfig, OrderFeeModuleAdapter } from '../types';

const formatNormalDate = (val: any, format = 'YYYY-MM-DD HH:mm') => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

/** 订单信息展示字段配置（海运进口） */
const displayFields: DisplayFieldConfig[] = [
  { key: 'mblNum', label: $t('seaImport.import.mblNum'), visible: true },
  {
    key: 'commissionNum',
    label: $t('seaImport.import.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('seaImport.import.clientId'), visible: true },
  { key: 'teamName', label: $t('seaImport.import.teamId'), visible: true },
  { key: 'vessel', label: $t('seaImport.import.vessel'), visible: true },
  {
    key: 'innerVoyno',
    label: $t('seaImport.import.innerVoyno'),
    visible: true,
  },
  {
    key: 'carrierName',
    label: $t('seaImport.import.carrierId'),
    visible: true,
  },
  { key: 'polName', label: $t('seaImport.import.polId'), visible: true },
  { key: 'podName', label: $t('seaImport.import.podId'), visible: true },
  {
    key: 'arrivalDate',
    label: $t('seaImport.import.arrivalDate'),
    visible: true,
  },
  {
    key: 'exchangeBillDate',
    label: $t('seaImport.import.exchangeBillDate'),
    visible: true,
  },
  {
    key: 'pickUpDate',
    label: $t('seaImport.import.pickUpDate'),
    visible: true,
  },
  {
    key: 'customsDeclareDate',
    label: $t('seaImport.import.customsDeclareDate'),
    visible: true,
  },
  {
    key: 'transferStationDate',
    label: $t('seaImport.import.transferStationDate'),
    visible: true,
  },
  {
    key: 'ctnUseDate',
    label: $t('seaImport.import.ctnUseDate'),
    visible: true,
  },
  { key: 'freeDays', label: $t('seaImport.import.freeDays'), visible: true },
  { key: 'noPkgs', label: $t('seaImport.import.noPkgs'), visible: true },
  { key: 'kgs', label: $t('seaImport.import.kgs'), visible: true },
  { key: 'cbm', label: $t('seaImport.import.cbm'), visible: true },
  { key: 'goodsDes', label: $t('seaImport.import.goodsDes'), visible: true },
];

/** 订单信息展示字段取值（海运进口） */
const getDisplayValue = (fieldKey: string, detail: any, to: any) => {
  switch (fieldKey) {
    case 'mblNum':
      return to?.mblNum || '--';
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
    case 'polName':
      return detail?.polRemark || '--';
    case 'podName':
      return detail?.podRemark || '--';
    case 'arrivalDate':
      return formatNormalDate(to?.etd, 'YYYY-MM-DD');
    case 'exchangeBillDate':
      return formatNormalDate(detail?.exchangeBillDate, 'YYYY-MM-DD');
    case 'pickUpDate':
      return formatNormalDate(detail?.pickUpDate, 'YYYY-MM-DD');
    case 'customsDeclareDate':
      return formatNormalDate(detail?.customsDeclareDate, 'YYYY-MM-DD');
    case 'transferStationDate':
      return formatNormalDate(detail?.transferStationDate, 'YYYY-MM-DD');
    case 'ctnUseDate':
      return formatNormalDate(detail?.ctnUseDate, 'YYYY-MM-DD');
    case 'freeDays':
      return detail?.freeDays ?? '--';
    case 'noPkgs':
      return to?.noPkgs ?? '--';
    case 'kgs':
      return to?.kgs ?? '--';
    case 'cbm':
      return to?.cbm ?? '--';
    case 'goodsDes':
      return to?.goodsDes || '--';
    default:
      return '--';
  }
};

/** 海运进口费用录入适配器 */
export const seaImportAdapter: OrderFeeModuleAdapter = {
  module: 'sea-import',
  bizType: 1,
  i18nPrefix: 'seaImport.import',
  dataI18nPrefix: 'seaImport.import',
  clientI18nModule: 'seaImport',
  displayFields,
  getDisplayValue,
  printBizType: PrintFormatBizType.SeaImport,
  api: {
    getDetail: getSeaImportDetail,
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
