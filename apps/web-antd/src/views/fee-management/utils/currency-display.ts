/** 常见中文币别名 → 英文代码（付费申请等展示用） */
const CN_NAME_TO_CODE: Record<string, string> = {
  人民币: 'RMB',
  美元: 'USD',
  欧元: 'EUR',
  港币: 'HKD',
  港元: 'HKD',
  日元: 'JPY',
  英镑: 'GBP',
  澳元: 'AUD',
  加元: 'CAD',
  新加坡元: 'SGD',
  新币: 'SGD',
};

/**
 * 展示用币别代码：优先英文 code；中文名映射为代码。
 * 避免「人民币未收 / 原始币别=人民币」这类中文展示。
 */
export function toCurrencyDisplayCode(
  code?: null | string,
  name?: null | string,
): string {
  const normalize = (raw?: null | string): string => {
    const v = raw?.trim();
    if (!v) return '';
    if (/^[A-Za-z]{2,5}$/.test(v)) return v.toUpperCase();
    return CN_NAME_TO_CODE[v] ?? '';
  };

  return (
    normalize(code) || normalize(name) || code?.trim() || name?.trim() || ''
  );
}
