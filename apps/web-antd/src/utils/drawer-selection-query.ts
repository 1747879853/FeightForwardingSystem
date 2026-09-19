import { shallowReactive } from 'vue';

/** 同一筛选范围缓存已访问页的数据，供勾选合计及确认共用。 */
export function createDrawerSelectionQuery<T>(
  keyOf: (row: T) => string,
  clearSelection: () => void,
) {
  const rows = shallowReactive(new Map<string, T>());
  let scope: string | undefined;
  let sequence = 0;

  return {
    get rows(): T[] {
      return [...rows.values()];
    },
    begin(params: object) {
      const next = JSON.stringify(
        Object.entries(params)
          .filter(
            ([key, value]) => !/^page(index|size)$/i.test(key) && value != null,
          )
          .sort(([a], [b]) => a.localeCompare(b)),
      );
      if (scope !== undefined && scope !== next) {
        rows.clear();
        clearSelection();
      }
      scope = next;
      return ++sequence;
    },
    isCurrent(request: number) {
      return request === sequence;
    },
    accept(request: number, items: T[]) {
      if (request !== sequence) return false;
      for (const row of items) rows.set(keyOf(row), row);
      return true;
    },
    reset() {
      sequence += 1;
      scope = undefined;
      rows.clear();
      clearSelection();
    },
  };
}
