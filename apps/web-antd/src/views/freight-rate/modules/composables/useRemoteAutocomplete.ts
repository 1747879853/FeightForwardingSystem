import { ref } from 'vue';

type SearchSession = {
  hasMore: boolean;
  keyword: string;
  labels: string[];
  loadingMore: boolean;
  pageIndex: number;
  total: number;
};

type AutocompleteEditorLike = {
  htEditor?: any;
  rawChoices?: string[];
  stripValuesIfNeeded: (values: string[]) => string[];
  updateChoicesList: (choices: string[]) => void;
  __remoteScrollHt?: any;
  __remoteScrollHandler?: EventListener;
};

export type RemotePageResult = {
  labels: string[];
  /** id→label 本页命中，写入运行时缓存 */
  pairs: Array<{ id: string; label: string }>;
  total: number;
};

/**
 * Handsontable autocomplete 远程搜索 + 滚动加载更多（港口/船公司/订舱代理共用）
 */
export function useRemoteAutocomplete(options: {
  pageSize?: number;
  debounceMs?: number;
  fetchPage: (
    keyword: string,
    pageIndex: number,
    pageSize: number,
  ) => Promise<RemotePageResult>;
}) {
  const pageSize = options.pageSize ?? 50;
  const debounceMs = options.debounceMs ?? 250;
  const { fetchPage } = options;

  const idToLabel = ref(new Map<string, string>());
  const labelToId = ref(new Map<string, string>());

  let searchSeq = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let session: SearchSession | null = null;
  let getActiveEditor: (() => AutocompleteEditorLike | null) | null = null;
  let boundEditor: AutocompleteEditorLike | null = null;

  function remember(id: number | string | null | undefined, label: string) {
    const idStr =
      id === undefined || id === null || id === '' ? '' : String(id);
    const text = (label ?? '').toString().trim();
    if (!idStr || !text) return;
    const nextIdToLabel = new Map(idToLabel.value);
    const nextLabelToId = new Map(labelToId.value);
    nextIdToLabel.set(idStr, text);
    nextLabelToId.set(text, idStr);
    idToLabel.value = nextIdToLabel;
    labelToId.value = nextLabelToId;
  }

  function rememberPairs(pairs: Array<{ id: string; label: string }>) {
    if (!pairs.length) return;
    const nextIdToLabel = new Map(idToLabel.value);
    const nextLabelToId = new Map(labelToId.value);
    for (const { id, label } of pairs) {
      const idStr = String(id ?? '').trim();
      const text = (label ?? '').toString().trim();
      if (!idStr || !text) continue;
      nextIdToLabel.set(idStr, text);
      nextLabelToId.set(text, idStr);
    }
    idToLabel.value = nextIdToLabel;
    labelToId.value = nextLabelToId;
  }

  function getCachedLabel(id: number | string | null | undefined): string {
    if (id === undefined || id === null || id === '') return '';
    return idToLabel.value.get(String(id)) || '';
  }

  function getScrollHolder(htEditor: any): HTMLElement | null {
    if (!htEditor) return null;
    try {
      const scrollable = htEditor.view?._wt?.wtOverlays?.scrollableElement;
      if (
        scrollable &&
        scrollable !== window &&
        scrollable !== htEditor.rootWindow &&
        typeof scrollable.scrollTop === 'number'
      ) {
        return scrollable as HTMLElement;
      }
    } catch {
      // ignore
    }
    return (
      (htEditor.rootElement?.querySelector?.(
        '.ht_master .wtHolder',
      ) as HTMLElement | null) ||
      (htEditor.rootElement?.querySelector?.(
        '.wtHolder',
      ) as HTMLElement | null) ||
      null
    );
  }

  function isDropdownNearBottom(editor: AutocompleteEditorLike): boolean {
    const htEditor = editor.htEditor;
    if (!htEditor) return false;
    const holder = getScrollHolder(htEditor);
    if (holder) {
      return holder.scrollHeight - holder.scrollTop - holder.clientHeight < 48;
    }
    const lastVisible = htEditor.getLastVisibleRow?.() ?? -1;
    const count = htEditor.countRows?.() ?? 0;
    if (lastVisible < 0 || count <= 0) return false;
    return lastVisible >= count - 5;
  }

  function applyChoicesToEditor(
    editor: AutocompleteEditorLike,
    labels: string[],
  ) {
    const htEditor = editor.htEditor;
    const holder = getScrollHolder(htEditor);
    const scrollTop = holder?.scrollTop ?? 0;
    const firstVisible = htEditor?.getFirstVisibleRow?.() ?? -1;

    editor.rawChoices = labels;
    editor.updateChoicesList(editor.stripValuesIfNeeded(labels));

    requestAnimationFrame(() => {
      const nextHolder = getScrollHolder(editor.htEditor);
      if (nextHolder) {
        nextHolder.scrollTop = scrollTop;
      } else if (firstVisible >= 0 && editor.htEditor?.scrollViewportTo) {
        editor.htEditor.scrollViewportTo(firstVisible, 0);
      }
    });
  }

  async function tryLoadMore(editor?: AutocompleteEditorLike | null) {
    const active = editor || boundEditor || getActiveEditor?.();
    if (!session || !session.hasMore || session.loadingMore) return;
    if (!active?.htEditor || !isDropdownNearBottom(active)) return;

    session.loadingMore = true;
    const nextPage = session.pageIndex + 1;
    const keyword = session.keyword;
    try {
      const { labels, pairs, total } = await fetchPage(
        keyword,
        nextPage,
        pageSize,
      );
      rememberPairs(pairs);
      if (!session || session.keyword !== keyword) return;
      if (session.pageIndex + 1 !== nextPage) return;

      if (labels.length === 0) {
        session.hasMore = false;
        session.total = session.labels.length;
        return;
      }

      const merged = [...session.labels];
      const seen = new Set(merged);
      for (const label of labels) {
        if (seen.has(label)) continue;
        seen.add(label);
        merged.push(label);
      }
      session.labels = merged;
      session.pageIndex = nextPage;
      session.total = Math.max(total, merged.length);
      session.hasMore =
        labels.length >= pageSize &&
        (session.total > session.labels.length || labels.length >= pageSize);
      if (total > 0 && session.labels.length >= total) {
        session.hasMore = false;
      }

      applyChoicesToEditor(active, session.labels);
      ensureScrollHook(active);
    } catch (error) {
      console.error('[remote autocomplete] load more failed:', error);
    } finally {
      if (session) session.loadingMore = false;
    }
  }

  function unbindScroll(editor: AutocompleteEditorLike | null | undefined) {
    if (!editor?.__remoteScrollHandler || !editor.__remoteScrollHt) return;
    const holder = getScrollHolder(editor.__remoteScrollHt);
    holder?.removeEventListener('scroll', editor.__remoteScrollHandler);
    editor.__remoteScrollHandler = undefined;
    editor.__remoteScrollHt = undefined;
  }

  function ensureScrollHook(editor: AutocompleteEditorLike | null | undefined) {
    if (!editor?.htEditor) return;
    const ht = editor.htEditor;
    if (editor.__remoteScrollHt === ht && editor.__remoteScrollHandler) return;

    unbindScroll(editor);

    const handler = () => {
      void tryLoadMore(editor);
    };
    editor.__remoteScrollHandler = handler;
    editor.__remoteScrollHt = ht;

    const holder = getScrollHolder(ht);
    if (holder) {
      holder.addEventListener('scroll', handler, { passive: true });
    } else {
      try {
        ht.addHook?.('afterScrollVertically', handler);
      } catch {
        editor.__remoteScrollHt = undefined;
        editor.__remoteScrollHandler = undefined;
      }
    }

    boundEditor = editor;
  }

  function scheduleBindScroll() {
    const bind = () => {
      const editor = getActiveEditor?.() || boundEditor;
      if (editor?.htEditor) {
        boundEditor = editor;
        ensureScrollHook(editor);
      }
    };
    queueMicrotask(bind);
    setTimeout(bind, 0);
    setTimeout(bind, 50);
    setTimeout(bind, 150);
  }

  function createSource(
    resolveActiveEditor?: () => AutocompleteEditorLike | null,
  ) {
    getActiveEditor = resolveActiveEditor ?? null;

    return (query: string, process: (items: string[]) => void) => {
      const keyword = (query ?? '').toString().trim();
      const seq = ++searchSeq;
      if (searchTimer) {
        clearTimeout(searchTimer);
        searchTimer = undefined;
      }

      const run = async () => {
        try {
          const { labels, pairs, total } = await fetchPage(
            keyword,
            1,
            pageSize,
          );
          rememberPairs(pairs);
          if (seq !== searchSeq) return;

          const nextLabels = [...labels];
          if (
            keyword &&
            labelToId.value.has(keyword) &&
            !nextLabels.includes(keyword)
          ) {
            nextLabels.unshift(keyword);
          }

          const effectiveTotal = Math.max(total, nextLabels.length);
          session = {
            keyword,
            pageIndex: 1,
            labels: nextLabels,
            total: effectiveTotal,
            loadingMore: false,
            hasMore:
              labels.length >= pageSize ||
              (effectiveTotal > nextLabels.length && labels.length > 0),
          };

          process(session.labels);
          scheduleBindScroll();
        } catch (error) {
          console.error('[remote autocomplete] search failed:', error);
          if (seq === searchSeq) {
            session = null;
            process([]);
          }
        }
      };

      if (!keyword) {
        void run();
      } else {
        searchTimer = setTimeout(() => void run(), debounceMs);
      }
    };
  }

  function clearCache() {
    unbindScroll(boundEditor);
    boundEditor = null;
    idToLabel.value = new Map();
    labelToId.value = new Map();
    session = null;
    searchSeq += 1;
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }
  }

  return {
    idToLabel,
    labelToId,
    remember,
    getCachedLabel,
    createSource,
    clearCache,
  };
}
