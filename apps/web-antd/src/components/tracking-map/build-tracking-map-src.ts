// 内嵌地址与企业编号仅来自 env，不在页面/代码中直接暴露原始 URL 与企业编号
const baseUrl = (import.meta.env.VITE_GLOB_TRACKING_MAP_URL as string) || '';
const companyId =
  (import.meta.env.VITE_GLOB_TRACKING_COMPANY_ID as string) || '';

/**
 * 拼装货物轨迹地图 iframe 地址。
 * - 地址与企业编号收敛在 env，调用方只传订阅号（referenceno / mblNo）
 * - 兼容带 hash（如 `#/Map`）的地址：仅用 URLSearchParams 处理 `?` 后查询段
 * - 缺少地址 / 企业编号 / 订阅号任一时返回空串
 */
export function buildTrackingMapSrc(referenceNo?: null | string) {
  const reference = referenceNo?.trim() ?? '';
  if (!baseUrl || !companyId || !reference) {
    return '';
  }
  const [path, query = ''] = baseUrl.split('?');
  const params = new URLSearchParams(query);
  params.set('companyid', companyId);
  params.set('referenceno', reference);
  return `${path}?${params.toString()}`;
}
