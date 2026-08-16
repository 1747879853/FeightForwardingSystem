/**
 * 第三方服务商文案清洗。
 *
 * 后端返回的 `errorMessage` / `message` / `trackingMessage` 原文里会带服务商名称
 * （例如订阅单号位数校验、「暂无跟踪数据」等），直接透传到界面就等于对用户暴露服务商，
 * 违反运踪白标要求。展示前一律先过这个函数。
 */

/** 需要屏蔽的服务商名称（大小写不敏感） */
const VENDOR_NAME_PATTERN = /飞驼|freightower|云当|trackingeyes/gi;

/** 统一替换成的中性称呼 */
const NEUTRAL_VENDOR_NAME = '运踪服务商';

/**
 * 把文案里的服务商名称替换为中性称呼。
 *
 * @param text 后端返回的原始文案
 * @returns 清洗后的文案；入参为空时返回空字符串
 */
export function sanitizeVendorText(text?: null | string): string {
  const raw = text?.trim();
  if (!raw) {
    return '';
  }
  return (
    raw
      .replace(VENDOR_NAME_PATTERN, NEUTRAL_VENDOR_NAME)
      // 「飞驼(Freightower)」这类连写会被替换成两段，合并成一段
      .replace(new RegExp(`(${NEUTRAL_VENDOR_NAME})[（(]?\\1[）)]?`, 'g'), '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}
