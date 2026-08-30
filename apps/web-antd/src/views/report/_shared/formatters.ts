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
      return date.toLocaleDateString();
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
