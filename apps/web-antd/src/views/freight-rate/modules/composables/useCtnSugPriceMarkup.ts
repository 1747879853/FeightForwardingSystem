import { ref } from 'vue';

const STORAGE_KEY = 'freight-rate-ctn-sug-price-markup';

/** 箱型指导价加价规则：指导价 = 成本价 + 加价（按箱型配置） */
export type CtnMarkupMap = Record<string, number>;

function readStorage(): CtnMarkupMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CtnMarkupMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(map: CtnMarkupMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

/** 模块级共享，批量新增/批量更新弹窗共用同一套加价规则 */
const markupByCtnId = ref<CtnMarkupMap>(readStorage());

export function useCtnSugPriceMarkup() {
  function getMarkup(ctnCodeId: string | number): number | undefined {
    const value = markupByCtnId.value[String(ctnCodeId)];
    return typeof value === 'number' && !Number.isNaN(value)
      ? value
      : undefined;
  }

  function setMarkups(next: CtnMarkupMap) {
    const cleaned: CtnMarkupMap = {};
    Object.entries(next).forEach(([id, value]) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        cleaned[String(id)] = value;
      }
    });
    markupByCtnId.value = cleaned;
    writeStorage(cleaned);
  }

  /** 成本 + 加价 → 指导价；无加价或成本无效时返回 undefined */
  function calcSugPrice(
    cost: unknown,
    ctnCodeId: string | number,
  ): number | undefined {
    if (cost === undefined || cost === null || cost === '') return undefined;
    const costNum = Number(cost);
    if (Number.isNaN(costNum)) return undefined;
    const markup = getMarkup(ctnCodeId);
    if (markup === undefined) return undefined;
    return costNum + markup;
  }

  /**
   * 按当前加价规则，把行上各箱型成本写成指导价字段 `ctnSug_${id}`。
   * @returns 实际写入的单元格数
   */
  function applyMarkupsToRows(rows: Array<Record<string, any>>): number {
    let changed = 0;
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!key.startsWith('ctn_') || key.startsWith('ctnSug_')) return;
        const ctnCodeId = key.slice(4);
        const sug = calcSugPrice(row[key], ctnCodeId);
        if (sug === undefined) return;
        const sugKey = `ctnSug_${ctnCodeId}`;
        if (row[sugKey] !== sug) {
          row[sugKey] = sug;
          changed += 1;
        }
      });
    });
    return changed;
  }

  return {
    markupByCtnId,
    getMarkup,
    setMarkups,
    calcSugPrice,
    applyMarkupsToRows,
  };
}
