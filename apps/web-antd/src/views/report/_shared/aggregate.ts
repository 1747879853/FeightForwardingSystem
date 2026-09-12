/**
 * 报表分组 / 合计 / 导出共用的聚合纯函数。
 * 与 Handsontable 无关，便于分组树与导出树复用同一口径。
 */

import {
  blankMixedCurrencyTotals,
  collectRowLocalCurrencies,
  LOCAL_CURRENCY_COLUMN_KEY,
} from './hot-columns';

/**
 * 汇总行的本位币口径：合计列（total*）以本位币计价，
 * 跨公司查询时不同行的本位币可能不同，此时不能直接加总，置为「多币别」。
 */
export function applyLocalCurrencyToAggregate(
  aggregatedRow: Record<string, any>,
  items: Record<string, any>[],
  columnKeys: string[],
) {
  const codes = collectRowLocalCurrencies(items);
  if (codes.length > 1) {
    blankMixedCurrencyTotals(aggregatedRow, columnKeys);
    return;
  }
  aggregatedRow[LOCAL_CURRENCY_COLUMN_KEY] = codes[0] ?? '';
}

/** 把单元格值解析为可累加数字；空值 / 「-」/ 非数字按 0 */
export function parseNumeric(value: unknown): number {
  if (value == null || value === '' || value === '-') return 0;
  const num = Number.parseFloat(String(value).replaceAll(',', ''));
  return Number.isNaN(num) ? 0 : num;
}

/** 累加结果格式化：全 0 显示空串，与原报表口径一致 */
export function formatSum(sum: number): string {
  const formatted = sum.toFixed(2);
  return formatted === '0.00' ? '' : formatted;
}

/** 文本列：统计各值出现次数，单值显示 `A(3)`，多值逗号拼接 */
export function aggregateTextValues(values: unknown[]): string {
  const valueCounts: Record<string, number> = {};

  for (const val of values) {
    if (val && val !== '-') {
      const key = String(val);
      valueCounts[key] = (valueCounts[key] || 0) + 1;
    }
  }

  const uniqueValues = Object.keys(valueCounts);
  if (uniqueValues.length === 0) return '-';
  if (uniqueValues.length === 1) {
    const value = uniqueValues[0]!;
    return `${value}(${valueCounts[value] || 0})`;
  }
  return uniqueValues
    .map((value) => `${value}(${valueCounts[value] || 0})`)
    .join(', ');
}

/**
 * 分组行利润率：利润 ÷ 应付。
 * 返回小数，由列渲染器乘 100 显示为百分比；应付为 0 时返回 null。
 */
export function calcGroupProfitRate(
  items: Record<string, any>[],
): number | null {
  let totalProfit = 0;
  let totalPayable = 0;
  for (const item of items) {
    totalProfit += parseNumeric(item.totalProfit);
    totalPayable += parseNumeric(item.totalPayable);
  }
  return totalPayable !== 0 ? totalProfit / totalPayable : null;
}

export interface FillAggregateOptions {
  items: Record<string, any>[];
  columnKeys: string[];
  currentGroupCol?: string;
  numericColumnKeys: Set<string>;
}

/**
 * 按列类型填充聚合行：数值累加、利润率重算、文本计数，并套用本位币口径。
 */
export function fillAggregatedColumns(
  aggregatedRow: Record<string, any>,
  {
    items,
    columnKeys,
    currentGroupCol,
    numericColumnKeys,
  }: FillAggregateOptions,
) {
  for (const col of columnKeys) {
    if (col === currentGroupCol) continue;

    if (numericColumnKeys.has(col)) {
      let sum = 0;
      for (const item of items) {
        sum += parseNumeric(item[col]);
      }
      aggregatedRow[col] = formatSum(sum);
    } else if (col === 'totalProfitRate') {
      aggregatedRow[col] = calcGroupProfitRate(items);
    } else {
      aggregatedRow[col] = aggregateTextValues(items.map((item) => item[col]));
    }
  }

  applyLocalCurrencyToAggregate(aggregatedRow, items, columnKeys);
}

/**
 * 收集多级分组下的全部 groupKey（不依赖展开状态）。
 * 用于「全部展开」。
 */
export function collectAllGroupKeys(
  data: Record<string, any>[],
  groupCols: string[],
  level = 0,
  keys: string[] = [],
): string[] {
  if (groupCols.length === 0 || data.length === 0) return keys;

  const [currentGroupCol, ...remainingGroupCols] = groupCols;
  if (!currentGroupCol) return keys;

  const groups = new Map<string, Record<string, any>[]>();
  for (const item of data) {
    const groupValue = String(item[currentGroupCol] || '空值');
    let bucket = groups.get(groupValue);
    if (!bucket) {
      bucket = [];
      groups.set(groupValue, bucket);
    }
    bucket.push(item);
  }

  for (const [groupName, items] of groups) {
    keys.push(`${currentGroupCol}|${groupName}|${level}`);
    if (remainingGroupCols.length > 0) {
      collectAllGroupKeys(items, remainingGroupCols, level + 1, keys);
    }
  }

  return keys;
}
