import type { CurrencyFieldDef, HotColumnDef } from './types';

/**
 * Handsontable 列与渲染器工厂
 * 用于消除各报表配置中重复的 renderer 样板代码
 */

/**
 * 文本渲染器工厂
 * 数据已在行转换阶段预格式化，渲染器只负责直接输出
 * @param fallback 空值时的占位内容，默认 '-'
 */
export function textRenderer(fallback = '-') {
  return (
    _instance: any,
    td: HTMLTableCellElement,
    _row: number,
    _col: number,
    _prop: string,
    value: any,
    _cellProperties: any,
  ) => {
    td.innerHTML = value || fallback;
    return td;
  };
}

/** 金额列默认宽度与样式 */
const AMOUNT_COLUMN_WIDTH = 120;

/**
 * 根据币别代码集合与币别字段定义，生成币别明细列配置
 * 行数据的键规则为 `${币别代码}_${field.key}`，如 USD_receivable
 */
export function buildCurrencyColumns(
  currencyCodes: string[],
  fields: CurrencyFieldDef[],
): HotColumnDef[] {
  const columns: HotColumnDef[] = [];
  // 按币别代码排序，确保列顺序一致
  const sortedCodes = [...currencyCodes].sort();

  sortedCodes.forEach((code) => {
    fields.forEach((field) => {
      columns.push({
        data: `${code}_${field.key}`,
        title: field.title(code),
        width: AMOUNT_COLUMN_WIDTH,
        className: 'htRight',
        renderer: textRenderer(''),
      });
    });
  });

  return columns;
}

/**
 * 生成币别明细列对应的数值列键集合（用于合计/聚合/右对齐）
 */
export function buildCurrencyNumericKeys(
  currencyCodes: string[],
  fields: CurrencyFieldDef[],
): string[] {
  const keys: string[] = [];
  currencyCodes.forEach((code) => {
    fields.forEach((field) => {
      keys.push(`${code}_${field.key}`);
    });
  });
  return keys;
}
