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
 * 本位币列：合计金额（total*）的计量单位。
 * 一次查询可跨多个公司，各行本位币可能不同，所以必须随行展示而不是写在列标题里。
 */
export const LOCAL_CURRENCY_COLUMN_KEY = 'localCurrencyCode';

/** 本位币列定义，放在合计列之前 */
export function localCurrencyColumn(): HotColumnDef {
  return {
    data: LOCAL_CURRENCY_COLUMN_KEY,
    title: '本位币',
    width: 90,
    renderer: textRenderer(),
  };
}

/** 合计列（total*）以本位币计量，跨本位币的行不能直接相加 */
export function isLocalCurrencyAmountColumn(key: string): boolean {
  return typeof key === 'string' && key.startsWith('total');
}

/** 取一组行里出现过的本位币代码 */
export function collectRowLocalCurrencies(
  rows: Record<string, any>[],
): string[] {
  const codes = new Set<string>();
  rows.forEach((row) => {
    const code = row?.[LOCAL_CURRENCY_COLUMN_KEY];
    if (code) codes.add(String(code));
  });
  return [...codes];
}

/**
 * 把跨本位币的合计单元格置为不可加总。
 * 币别明细列（`${code}_${field}`）本身按原币分列，不受影响。
 */
export function blankMixedCurrencyTotals(
  row: Record<string, any>,
  columnKeys: string[],
) {
  columnKeys.forEach((key) => {
    if (!isLocalCurrencyAmountColumn(key)) return;
    // 利润率列的渲染器按 null 输出占位，给 '-' 会被 parseFloat 解析成 NaN
    row[key] = key === 'totalProfitRate' ? null : '-';
  });
  row[LOCAL_CURRENCY_COLUMN_KEY] = '多币别';
}

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
