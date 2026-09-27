import { getCurrencyEnumSymbolOptions } from '#/views/_shared/order-fee/data';

/** 本位币代码对应的符号。没认出来时仍用人民币符号。 */
export function currencySymbol(code?: null | string) {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  if (!normalized || normalized === 'RMB' || normalized === 'CNY') return '￥';
  const option = getCurrencyEnumSymbolOptions().find(
    (item) => item.key?.toUpperCase() === normalized,
  );
  return option?.label || '￥';
}

export function formatLocalMoney(
  value?: null | number,
  code?: null | string,
  empty = '—',
) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return empty;
  }
  const amount = Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol(code)} ${amount}`;
}
