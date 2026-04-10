import {
  type SelectedFeeItem,
  type CurrencyInfo,
} from '../add-fee-statement-modal/data';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

import { $t } from '#/locales';

const t = (key: string) => $t(`seaExport.export.statement.${key}`);

/** 费用明细表格行（在 SelectedFeeItem 基础上增加业务展示字段） */
export interface FeeDetailRow extends SelectedFeeItem {
  /** 委托编号 */
  commissionNum?: string;
  /** 票据编号 */
  mblNum?: string;
  /** 会计日期 */
  accountDate?: string;
  /** 开船日期 */
  etd?: string;
  /** 起运港 */
  polName?: string;
  /** 目的港 */
  podName?: string;
  /** 销售 */
  saleUserNames?: string;
  /** 操作 */
  operationUserNames?: string;
  /** 客服 */
  customerServiceUserNames?: string;
  /** 备注（行级） */
  itemRemark?: string;
}

/** 币别汇总信息 */
export interface CurrencySummary {
  currencyId: number;
  currencyName: string;
  payAmount: number;
  payUnSettledAmount: number;
  receivableAmount: number;
  receivableUnSettledAmount: number;
}

/** 订单内单个币别的汇总 */
export interface OrderCurrencyAmount {
  currencyName: string;
  amount: number;
}

/** 订单分组行（费用明细外层展示） */
export interface OrderGroupRow {
  key: string;
  transportOrderId: string;
  commissionNum: string;
  mblNum: string;
  clientName: string;
  etd: string;
  accountDate: string;
  polName: string;
  podName: string;
  saleUserNames: string;
  operationUserNames: string;
  customerServiceUserNames: string;
  children: FeeDetailRow[];
  currencySummaries: OrderCurrencyAmount[];
}
/** 计算某个订单的某币别的应收/应付合计 */
export function calcCurrencySummary(
  orderFees: FeeDetailRow[],
  currencyId: number,
  paySide: number,
): number {
  console.log('MainTable-calcCurrencySummary', orderFees, currencyId, paySide);
  return orderFees
    .filter((f) => f.currencyId === currencyId && f.paySide === paySide)
    .reduce((sum, f) => sum + (f.unSettledAmount ?? 0), 0);
}
/** 按订单分组费用，计算各币别汇总 */
export function groupFeesByOrder(
  fees: FeeDetailRow[],
  currencies: CurrencyInfo[],
): OrderGroupRow[] {
  const map = new Map<string, FeeDetailRow[]>();
  for (const fee of fees) {
    const id = fee.transportOrderId;
    const list = map.get(id);
    if (list) {
      list.push(fee);
    } else {
      map.set(id, [fee]);
    }
  }

  return [...map.entries()].map(([transportOrderId, items]) => {
    const first = items[0]!;
    const cMap = new Map<number, OrderCurrencyAmount>();
    for (const f of items) {
      const existing = cMap.get(f.currencyId);
      if (existing) {
        existing.amount += 0;
      } else {
        cMap.set(f.currencyId, {
          currencyName: f.currencyName ?? '',
          amount: 0,
        });
      }
    }
    let row = {
      key: `order_${transportOrderId}`,
      transportOrderId,
      commissionNum: first.commissionNum ?? '',
      mblNum: first.mblNum ?? '',
      clientName: first.clientName ?? first.settlementName ?? '',
      etd: first.etd ?? '',
      accountDate: first.accountDate ?? '',
      polName: first.polName ?? '',
      podName: first.podName ?? '',
      saleUserNames: first.saleUserNames ?? '',
      operationUserNames: first.operationUserNames ?? '',
      customerServiceUserNames: first.customerServiceUserNames ?? '',
      children: items,
      currencySummaries: [...cMap.values()],
    };

    for (const c of currencies) {
      row[`currency_${c.currencyId}_receive`] = calcCurrencySummary(
        items ?? [],
        c.currencyId,
        0,
      );
      row[`currency_${c.currencyId}_pay`] = calcCurrencySummary(
        items ?? [],
        c.currencyId,
        1,
      );
    }
    console.log('groupFeesByOrder row', row);
    return row;
  });
}

/** 订单分组外层列 */
export function useOrderGroupColumns() {
  return [
    {
      title: t('serialNumber'),
      dataIndex: 'seq',
      key: 'seq',
      width: 56,
    },
    {
      title: t('commissionNum'),
      dataIndex: 'commissionNum',
      key: 'commissionNum',
      width: 160,
      ellipsis: true,
    },
    {
      title: t('mblNum'),
      dataIndex: 'mblNum',
      key: 'mblNum',
      width: 160,
      ellipsis: true,
    },
    {
      title: t('clientName'),
      dataIndex: 'clientName',
      key: 'clientName',
      width: 160,
      ellipsis: true,
    },
    {
      title: t('etd'),
      dataIndex: 'etd',
      key: 'etd',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('accountDate'),
      dataIndex: 'accountDate',
      key: 'accountDate',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('polName'),
      dataIndex: 'polName',
      key: 'polName',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('podName'),
      dataIndex: 'podName',
      key: 'podName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '销售',
      dataIndex: 'saleUserNames',
      key: 'saleUserNames',
      width: 120,
      ellipsis: true,
    },
    {
      title: '操作',
      dataIndex: 'operationUserNames',
      key: 'operationUserNames',
      width: 120,
      ellipsis: true,
    },
    {
      title: '客服',
      dataIndex: 'customerServiceUserNames',
      key: 'customerServiceUserNames',
      width: 120,
      ellipsis: true,
    },
  ];
}

/** 费用明细内层列（展开后显示），根据结算币别模式返回不同列 */
export function useFeeInnerColumns() {
  const prefix = [
    { title: '', dataIndex: 'checkbox', key: 'checkbox', width: 36 },
    { title: t('serialNumber'), dataIndex: 'seq', key: 'seq', width: 44 },
    {
      title: t('settlementNameColumn'),
      dataIndex: 'settlementName',
      key: 'settlementName',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('paySide'),
      dataIndex: 'paySide',
      key: 'paySide',
      width: 60,
    },
    {
      title: t('feeCodeName'),
      dataIndex: 'feeCodeName',
      key: 'feeCodeName',
      width: 120,
    },
    {
      title: t('originalCurrencyLabel'),
      dataIndex: 'currencyName',
      key: 'currencyName',
      width: 80,
    },
  ];

  return [
    ...prefix,
    {
      title: t('originalExchangeRate'),
      dataIndex: 'exchangeRate',
      key: 'exchangeRate',
      width: 100,
      align: 'right' as const,
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right' as const,
    },
    {
      title: t('settledAmountLabel'),
      dataIndex: 'settledAmount',
      key: 'settledAmount',
      width: 100,
      align: 'right' as const,
    },
    {
      title: t('unSettledAmountLabel'),
      dataIndex: 'unSettledAmount',
      key: 'unSettledAmount',
      width: 110,
      align: 'right' as const,
    },
    {
      title: t('remark'),
      dataIndex: 'remark',
      key: 'remark',
      width: 110,
    },
  ];
}

/** 币别折算汇总（指定结算币别时使用），按币别+汇率分组 */
export interface CurrencyConversionSummary {
  currencyId: number;
  currencyName: string;
  /** 该组使用的申请汇率 */
  rate: number;
  originalTotal: number;
  convertedTotal: number;
}

/** 按币别+汇率分组汇总费用并计算折算金额（同一币别不同汇率分别展示） */
export function summarizeByCurrencyWithConversion(
  fees: FeeDetailRow[],
): CurrencyConversionSummary[] {
  const map = new Map<string, CurrencyConversionSummary>();
  for (const fee of fees) {
    const applied = fee.appliedAmount ?? 0;
    const rate = fee.rate ?? 1;
    const converted = Math.round(applied * rate * 100) / 100;
    const key = `${fee.currencyId}_${rate}`;
    const existing = map.get(key);
    if (existing) {
      existing.originalTotal += applied;
      existing.convertedTotal += converted;
    } else {
      map.set(key, {
        currencyId: fee.currencyId,
        currencyName: fee.currencyName ?? '',
        rate,
        originalTotal: applied,
        convertedTotal: converted,
      });
    }
  }
  return [...map.values()];
}

/** 按币别分组汇总费用 */
export function summarizeByCurrency(fees: FeeDetailRow[]): CurrencySummary[] {
  const map = new Map<number, CurrencySummary>();
  console.log('summarizeByCurrency', fees);
  map.set(9999, {
    currencyId: 9999,
    currencyName: '合计',
    payAmount: 0,
    payUnSettledAmount: 0,
    receivableAmount: 0,
    receivableUnSettledAmount: 0,
  });
  for (const fee of fees) {
    const existing = map.get(fee.currencyId);
    if (existing && fee.paySide === 1) {
      existing.payAmount += fee.amount ?? 0;
      existing.payUnSettledAmount += fee.unSettledAmount ?? 0;
    } else if (existing && fee.paySide === 0) {
      existing.receivableAmount += fee.amount ?? 0;
      existing.receivableUnSettledAmount += fee.unSettledAmount ?? 0;
    } else {
      map.set(fee.currencyId, {
        currencyId: fee.currencyId,
        currencyName: fee.currencyName ?? '',
        payAmount: fee.paySide === 1 ? (fee.amount ?? 0) : 0,
        payUnSettledAmount: fee.paySide === 1 ? (fee.unSettledAmount ?? 0) : 0,
        receivableAmount: fee.paySide === 0 ? (fee.amount ?? 0) : 0,
        receivableUnSettledAmount:
          fee.paySide === 0 ? (fee.unSettledAmount ?? 0) : 0,
      });
    }
    const total = map.get(9999);
    if (total && fee.paySide === 1) {
      total.payAmount += fee.amount * (fee.exchangeRate ?? 0);
      total.payUnSettledAmount +=
        (fee.unSettledAmount ?? 0) * (fee.exchangeRate ?? 1);
    } else if (total && fee.paySide === 0) {
      total.receivableAmount += fee.amount * (fee.exchangeRate ?? 0);
      total.receivableUnSettledAmount +=
        (fee.unSettledAmount ?? 0) * (fee.exchangeRate ?? 1);
    }
  }
  return [...map.values()];
}

/** 计算所有费用折算到结算币别的总额 */
export function calcConvertedTotal(fees: FeeDetailRow[]): number {
  let total = 0;
  for (const fee of fees) {
    const r = fee.rate ?? 1;
    total += (fee.amount ?? 0) * r;
  }
  return total;
}

export function formatAmount(val: number | undefined | null): string {
  if (val == null) return '';
  return Number(val).toFixed(2);
}
