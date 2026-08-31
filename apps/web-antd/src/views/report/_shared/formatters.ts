/**
 * 报表通用格式化工具
 * 从利润报表/欠费报表页面抽取的公共格式化逻辑
 */

/**
 * 安全的日期格式化函数
 * @param dateStr 日期字符串
 * @param format 'date' 输出本地日期，'month' 输出 YYYY/MM
 */
export function safeFormatDate(
  dateStr: null | string | undefined,
  format: 'date' | 'month' = 'date',
): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    console.warn('无效的日期格式:', dateStr);
    return '-';
  }
  try {
    if (format === 'month') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    } else {
      // 统一输出 YYYY-MM-DD，避免 toLocaleDateString 受浏览器本地化影响
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.warn('日期格式化失败:', dateStr, error);
    return '-';
  }
}

/**
 * 格式化业务类型
 */
export function formatBizType(bizType: number) {
  const typeMap: Record<number, string> = {
    0: '海运出口',
    1: '海运进口',
    2: '空运出口',
  };
  return typeMap[bizType] || '-';
}

/**
 * 格式化箱型箱量
 */
export function formatCtns(ctns: any[]) {
  if (!ctns || ctns.length === 0) return '-';
  return ctns.map((ctn) => `${ctn.ctnCode.ctnName}×${ctn.count}`).join(', ');
}

/** 装运方式枚举：整柜=0、拼箱分票=1、拼箱主票=2 */
const BL_TYPE_MAP: Record<number, string> = {
  0: '整柜',
  1: '拼箱分票',
  2: '拼箱主票',
};

/**
 * 格式化装运方式
 */
export function formatBlType(blType: null | number | undefined) {
  if (blType == null) return '-';
  return BL_TYPE_MAP[blType] || '-';
}

/**
 * 计算 TEU：各箱型 teu × 箱量累加，保留两位小数；无箱量或为 0 时返回空串
 */
export function formatTeu(
  ctns: { count: number; ctnCode: { teu: number } }[] | null | undefined,
) {
  if (!ctns || ctns.length === 0) return '';
  const total = ctns.reduce(
    (sum, ctn) => sum + (ctn.ctnCode?.teu || 0) * (ctn.count || 0),
    0,
  );
  return total > 0 ? total.toFixed(2) : '';
}

/**
 * 根据业务类型自动设置港口类型
 * 空运出口（bizType=2）使用空港，其余使用海港
 */
export function setPortTypeByBizType(queryParams: Record<string, any>) {
  const { bizType } = queryParams;
  if (bizType !== undefined && bizType !== null) {
    if (bizType === 2) {
      queryParams.polIsSeaPort = false;
      queryParams.podIsSeaPort = false;
    } else {
      queryParams.polIsSeaPort = true;
      queryParams.podIsSeaPort = true;
    }
  }
  return queryParams;
}
