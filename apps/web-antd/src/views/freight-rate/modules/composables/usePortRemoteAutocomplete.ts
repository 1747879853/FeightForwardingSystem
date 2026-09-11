import type { PortCodeAdminApi } from '#/api/system/base-data/port-code-admin';

import { ref } from 'vue';

import {
  getPortCodeDetail,
  getPortCodePagedList,
} from '#/api/system/base-data/port-code-admin';

/** 与历史全量缓存一致：`港口英文名/国家英文名` */
export function formatPortLabel(
  port:
    | Pick<PortCodeAdminApi.PortCodeDto, 'portName' | 'cnName' | 'country'>
    | null
    | undefined,
): string {
  if (!port) return '';
  const name = (port.portName || port.cnName || '').toString().trim();
  if (!name) return '';
  const country = (port.country?.countryEnName ?? '').toString().trim();
  return country ? `${name}/${country}` : name;
}

type PortSearchSession = {
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
  /** 已绑定滚动的内部 htEditor 实例（每次 open 会重建） */
  __portScrollHt?: any;
  __portScrollHandler?: EventListener;
};

/**
 * Handsontable 港口列远程搜索 + 滚动加载更多：
 * - 首屏/关键字：GetPagedListAsync 第 1 页
 * - 滑到下拉底部：继续加载下一页并追加
 * - 同步维护 label↔id，供提交回写
 */
export function usePortRemoteAutocomplete(options?: {
  pageSize?: number;
  debounceMs?: number;
}) {
  const pageSize = options?.pageSize ?? 50;
  const debounceMs = options?.debounceMs ?? 250;

  /** id → label */
  const portIdToLabel = ref(new Map<string, string>());
  /** label → id（字符串，避免雪花精度丢失） */
  const portLabelToId = ref(new Map<string, string>());

  let searchSeq = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let session: PortSearchSession | null = null;
  let getActiveEditor: (() => AutocompleteEditorLike | null) | null = null;
  /** source 回调后缓存的编辑器，避免滚动时 getActiveEditor 拿不到 */
  let boundEditor: AutocompleteEditorLike | null = null;

  function rememberPort(id: number | string | null | undefined, label: string) {
    const idStr =
      id === undefined || id === null || id === '' ? '' : String(id);
    const text = (label ?? '').toString().trim();
    if (!idStr || !text) return;
    const nextIdToLabel = new Map(portIdToLabel.value);
    const nextLabelToId = new Map(portLabelToId.value);
    nextIdToLabel.set(idStr, text);
    nextLabelToId.set(text, idStr);
    portIdToLabel.value = nextIdToLabel;
    portLabelToId.value = nextLabelToId;
  }

  function rememberPortDto(
    port: PortCodeAdminApi.PortCodeDto | null | undefined,
  ) {
    if (!port?.id) return;
    const label = formatPortLabel(port);
    if (label) rememberPort(port.id, label);
  }

  function getCachedPortLabel(id: number | string | null | undefined): string {
    if (id === undefined || id === null || id === '') return '';
    return portIdToLabel.value.get(String(id)) || '';
  }

  async function fetchPortPage(
    keyword: string,
    pageIndex: number,
  ): Promise<{ labels: string[]; total: number }> {
    const res = await getPortCodePagedList({
      Keyword: keyword || undefined,
      PageIndex: pageIndex,
      PageSize: pageSize,
      Status: 0,
    });
    const labels: string[] = [];
    for (const item of res.items || []) {
      const label = formatPortLabel(item);
      if (!label) continue;
      rememberPortDto(item);
      labels.push(label);
    }
    const total = Number(res.totalCount);
    return {
      labels,
      // 后端偶发不回 totalCount 时，用「本页满页」推断还有更多
      total: Number.isFinite(total) && total > 0 ? total : labels.length,
    };
  }

  /** 取 autocomplete 下拉内部可滚动容器 */
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
      const gap = holder.scrollHeight - holder.scrollTop - holder.clientHeight;
      return gap < 48;
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

    // 追加后恢复滚动位置，避免跳回顶部
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
      const { labels, total } = await fetchPortPage(keyword, nextPage);
      if (!session || session.keyword !== keyword) return;
      if (session.pageIndex + 1 !== nextPage) return;

      // 本页空：没有更多
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
      // 满页才继续滑；不足一页说明到底
      session.hasMore =
        labels.length >= pageSize &&
        (session.total > session.labels.length || labels.length >= pageSize);

      // 若 total 可信且已达总数，停
      if (total > 0 && session.labels.length >= total) {
        session.hasMore = false;
      }

      applyChoicesToEditor(active, session.labels);
      // loadData 后 holder 可能变，重新确保监听
      ensureScrollHook(active);
    } catch (error) {
      console.error('[port autocomplete] load more failed:', error);
    } finally {
      if (session) session.loadingMore = false;
    }
  }

  function unbindScroll(editor: AutocompleteEditorLike | null | undefined) {
    if (!editor?.__portScrollHandler || !editor.__portScrollHt) return;
    const holder = getScrollHolder(editor.__portScrollHt);
    holder?.removeEventListener('scroll', editor.__portScrollHandler);
    editor.__portScrollHandler = undefined;
    editor.__portScrollHt = undefined;
  }

  /**
   * 绑定当前下拉滚动容器。
   * Autocomplete 每次 open 会 destroy 重建 htEditor，必须按实例重绑，不能只记一次 flag。
   */
  function ensureScrollHook(editor: AutocompleteEditorLike | null | undefined) {
    if (!editor?.htEditor) return;
    const ht = editor.htEditor;
    if (editor.__portScrollHt === ht && editor.__portScrollHandler) return;

    unbindScroll(editor);

    const handler = () => {
      void tryLoadMore(editor);
    };
    editor.__portScrollHandler = handler;
    editor.__portScrollHt = ht;

    // 原生 scroll：比 afterScrollVertically 更稳（内部 HOT 重建/虚拟滚动都适用）
    const holder = getScrollHolder(ht);
    if (holder) {
      holder.addEventListener('scroll', handler, { passive: true });
    } else {
      // DOM 尚未就绪时退回 hook，下次 process 再试
      try {
        ht.addHook?.('afterScrollVertically', handler);
      } catch {
        editor.__portScrollHt = undefined;
        editor.__portScrollHandler = undefined;
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

  /**
   * Handsontable autocomplete `source(query, process)`
   * @param resolveActiveEditor 用于挂滚动加载；返回当前 autocomplete 编辑器
   */
  function createPortSource(
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
          const { labels, total } = await fetchPortPage(keyword, 1);
          if (seq !== searchSeq) return;

          const nextLabels = [...labels];
          if (
            keyword &&
            portLabelToId.value.has(keyword) &&
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
          console.error('[port autocomplete] search failed:', error);
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

  /** 编辑/AI 回填：用嵌套港口对象写缓存并返回展示文案 */
  function resolvePortLabelFromRow(
    row: {
      polId?: number | string;
      podId?: number | string;
      poT1Id?: number | string;
      poT2Id?: number | string;
      pol?: PortCodeAdminApi.PortCodeDto | null;
      pod?: PortCodeAdminApi.PortCodeDto | null;
      poT1?: PortCodeAdminApi.PortCodeDto | null;
      poT2?: PortCodeAdminApi.PortCodeDto | null;
    },
    field: 'pol' | 'pod' | 'poT1' | 'poT2',
  ): string {
    const dto = row[field];
    const id =
      field === 'pol'
        ? row.polId
        : field === 'pod'
          ? row.podId
          : field === 'poT1'
            ? row.poT1Id
            : row.poT2Id;
    if (dto) {
      const label = formatPortLabel(dto);
      if (label) {
        rememberPort(dto.id ?? id, label);
        return label;
      }
    }
    return getCachedPortLabel(id);
  }

  /** 仅有 ID 时批量拉详情补全 label（编辑回显兜底） */
  async function ensurePortLabelsByIds(
    ids: Array<number | string | null | undefined>,
  ) {
    const missing = [
      ...new Set(
        ids
          .filter((id) => id !== undefined && id !== null && id !== '')
          .map((id) => String(id))
          .filter((id) => !portIdToLabel.value.has(id)),
      ),
    ];
    await Promise.all(
      missing.map(async (id) => {
        try {
          const detail = await getPortCodeDetail(id);
          rememberPortDto(detail);
        } catch (error) {
          console.warn(`[port autocomplete] detail failed for ${id}:`, error);
        }
      }),
    );
  }

  function clearPortCache() {
    unbindScroll(boundEditor);
    boundEditor = null;
    portIdToLabel.value = new Map();
    portLabelToId.value = new Map();
    session = null;
    searchSeq += 1;
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }
  }

  return {
    portIdToLabel,
    portLabelToId,
    rememberPort,
    rememberPortDto,
    getCachedPortLabel,
    createPortSource,
    resolvePortLabelFromRow,
    ensurePortLabelsByIds,
    clearPortCache,
    formatPortLabel,
  };
}
