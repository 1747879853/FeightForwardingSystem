/**
 * 费用录入表列元数据（单一来源）。
 * Handsontable / VXE 各自按本表做薄适配，避免双份 field/title/width 漂移。
 */

export type OrderFeeColumnTitle =
  | { kind: 'orderFee'; key: string }
  | { kind: 'client'; key: string }
  | { kind: 'literal'; text: string }
  | { kind: 'i18n'; path: string };

export type OrderFeeColumnMeta = {
  field: string;
  title: OrderFeeColumnTitle;
  width: number;
  sortable?: boolean;
  align?: 'center' | 'left' | 'right';
  /** Handsontable 绝对列宽（覆盖 width） */
  hotWidth?: number;
  /** Handsontable 在 width 基础上的增量 */
  hotWidthDelta?: number;
};

/** 可编辑费用表列顺序与基础展示属性 */
export const ORDER_FEE_EDIT_COLUMN_META: OrderFeeColumnMeta[] = [
  {
    field: 'invoiceStatus',
    title: { kind: 'orderFee', key: 'invoiceStatus' },
    width: 65,
    sortable: true,
    hotWidth: 100,
  },
  {
    field: 'combinedFeeStatus',
    title: { kind: 'orderFee', key: 'feeStatus' },
    width: 75,
    sortable: true,
    align: 'center',
    hotWidth: 110,
  },
  {
    field: 'feeCodeId',
    title: { kind: 'orderFee', key: 'feecodeName' },
    width: 150,
    sortable: true,
  },
  {
    field: 'industryCategory',
    title: { kind: 'client', key: 'industryCategories' },
    width: 100,
    sortable: true,
  },
  {
    field: 'settlementId',
    title: { kind: 'orderFee', key: 'settlement' },
    width: 130,
    sortable: true,
  },
  {
    field: 'currencyId',
    title: { kind: 'orderFee', key: 'currency' },
    width: 60,
    sortable: true,
    align: 'center',
  },
  {
    field: 'exchangeRate',
    title: { kind: 'orderFee', key: 'ExchangeRate' },
    width: 60,
    sortable: true,
    align: 'right',
  },
  {
    field: 'unitPrice',
    title: { kind: 'orderFee', key: 'unitPrice' },
    width: 80,
    sortable: true,
    align: 'right',
  },
  {
    field: 'amount',
    title: { kind: 'orderFee', key: 'amount' },
    width: 100,
    sortable: true,
    align: 'right',
  },
  {
    field: 'unit',
    title: { kind: 'orderFee', key: 'unitEmum' },
    width: 70,
    sortable: true,
  },
  {
    field: 'quantity',
    title: { kind: 'orderFee', key: 'quantity' },
    width: 70,
    sortable: true,
    align: 'right',
  },
  {
    field: 'taxRate',
    title: { kind: 'orderFee', key: 'taxRate' },
    width: 60,
    sortable: true,
    align: 'right',
  },
  {
    field: 'noTaxUnitPrice',
    title: { kind: 'orderFee', key: 'noTaxUnitPrice' },
    width: 90,
    sortable: true,
    align: 'right',
  },
  {
    field: 'noTaxAmount',
    title: { kind: 'orderFee', key: 'noTaxAmount' },
    width: 100,
    sortable: true,
    align: 'right',
  },
  {
    field: 'statementNum',
    title: { kind: 'literal', text: '对账单' },
    width: 120,
    sortable: false,
    align: 'center',
  },
  {
    field: 'rqstPaymentAmount',
    title: { kind: 'orderFee', key: 'rqstPaymentAmount' },
    width: 105,
    sortable: true,
    align: 'right',
  },
  {
    field: 'invoicedAmount',
    title: { kind: 'orderFee', key: 'invoicedAmount' },
    width: 100,
    sortable: true,
    align: 'right',
  },
  {
    field: 'orderInvoiceAmount',
    title: { kind: 'orderFee', key: 'orderInvoiceAmount' },
    width: 105,
    sortable: true,
    align: 'right',
  },
  {
    field: 'settledAmount',
    title: { kind: 'orderFee', key: 'settledAmount' },
    width: 100,
    sortable: true,
    align: 'right',
  },
  {
    field: 'invoiceBlocked',
    title: { kind: 'orderFee', key: 'canInvoice' },
    width: 75,
    sortable: true,
    align: 'center',
  },
  {
    field: 'isConfidential',
    title: { kind: 'orderFee', key: 'isConfidential' },
    width: 75,
    sortable: true,
    align: 'center',
  },
  {
    field: 'remark',
    title: { kind: 'orderFee', key: 'remark' },
    width: 120,
    sortable: true,
  },
  {
    field: 'dataEntryMethod',
    title: { kind: 'orderFee', key: 'dataEntryMethod' },
    width: 80,
    sortable: true,
    hotWidthDelta: 50,
  },
  {
    field: 'creatorUserName',
    title: { kind: 'i18n', path: 'auditApproval.task.creatorUserName' },
    width: 90,
    sortable: true,
  },
  {
    field: 'creationTime',
    title: { kind: 'i18n', path: 'auditApproval.task.createTime' },
    width: 155,
    sortable: true,
  },
];

export function resolveHotColumnWidth(meta: OrderFeeColumnMeta): number {
  if (meta.hotWidth != null) return meta.hotWidth;
  return (meta.width || 100) + (meta.hotWidthDelta ?? 0);
}
