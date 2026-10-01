/**
 * 匹配「默认商品编码」：同时兼容 currency.code 与历史字段 defaultCurrency。
 */
export function findDefaultCodeInvoice<
  T extends {
    isDefault?: boolean;
    defaultCurrency?: string;
    currency?: { code?: string };
  },
>(list: T[], currencyCode: string): T | undefined {
  if (!currencyCode) return undefined;
  return list.find(
    (item) =>
      !!item.isDefault &&
      (item.currency?.code === currencyCode ||
        item.defaultCurrency === currencyCode),
  );
}

/**
 * 根据购方银行 id，在客户开票信息列表中找到所属抬头。
 * fixedHeaderId / headerId 在业务上实际存的是 clientInvoiceBankId。
 */
export function findClientInvoiceInfoByBankId<
  T extends {
    id?: string | number;
    header?: string;
    clientInvoiceBanks?: Array<{ id?: string | number }>;
  },
>(list: T[], bankId: string | number | null | undefined): T | undefined {
  if (bankId == null || bankId === '') return undefined;
  const key = String(bankId);
  return list.find((info) =>
    (info.clientInvoiceBanks || []).some((b) => String(b.id) === key),
  );
}
