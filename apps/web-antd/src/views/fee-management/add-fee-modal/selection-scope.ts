/** 筛选范围变化时清空已选费用；分页属于同一范围，保留跨页选择。 */
export function createSelectionScope(clearSelection: () => void) {
  let snapshot: string | undefined;

  return {
    reset() {
      snapshot = undefined;
    },
    update(params: object) {
      const next = JSON.stringify(
        Object.entries(params)
          .filter(([key]) => key !== 'PageIndex' && key !== 'PageSize')
          .sort(([left], [right]) => left.localeCompare(right)),
      );
      if (snapshot !== undefined && snapshot !== next) clearSelection();
      snapshot = next;
    },
  };
}
