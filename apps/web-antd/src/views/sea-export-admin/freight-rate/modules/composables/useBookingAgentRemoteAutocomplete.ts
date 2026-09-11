import { getClientPagedList } from '#/api/common/client';

import { useRemoteAutocomplete } from './useRemoteAutocomplete';

/** 订舱代理 industryCategory = 'o'（与 baseStore 一致） */
const BOOKING_AGENT_INDUSTRY = 'o';

type BookingAgentLike = {
  id?: number | string;
  name?: string;
  fullName?: string;
};

/** 与历史全量缓存一致：简称优先，否则全称 */
export function formatBookingAgentLabel(
  client?: null | BookingAgentLike,
): string {
  if (!client) return '';
  return ((client.name || client.fullName || '') as string).toString().trim();
}

/**
 * Handsontable 订舱代理列远程搜索 + 滚动加载更多
 */
export function useBookingAgentRemoteAutocomplete(options?: {
  pageSize?: number;
  debounceMs?: number;
}) {
  const remote = useRemoteAutocomplete({
    pageSize: options?.pageSize,
    debounceMs: options?.debounceMs,
    async fetchPage(keyword, pageIndex, pageSize) {
      const res = await getClientPagedList({
        keyword: keyword || undefined,
        industryCategory: BOOKING_AGENT_INDUSTRY,
        pageIndex,
        pageSize,
      });
      const pairs: Array<{ id: string; label: string }> = [];
      const labels: string[] = [];
      const seen = new Set<string>();
      for (const item of res.items || []) {
        const id = String(item?.id ?? '').trim();
        const label = formatBookingAgentLabel(item);
        if (!id || !label || seen.has(label)) continue;
        seen.add(label);
        labels.push(label);
        pairs.push({ id, label });
      }
      const total = Number(res.totalCount);
      return {
        labels,
        pairs,
        total: Number.isFinite(total) && total > 0 ? total : labels.length,
      };
    },
  });

  function rememberBookingAgentDto(
    client: BookingAgentLike | null | undefined,
  ) {
    if (!client?.id) return;
    const label = formatBookingAgentLabel(client);
    if (label) remote.remember(client.id, label);
  }

  function resolveBookingAgentLabelFromRow(row: {
    bookingAgentId?: number | string;
    bookingAgent?: BookingAgentLike | null;
  }): string {
    if (row.bookingAgent) {
      const label = formatBookingAgentLabel(row.bookingAgent);
      if (label) {
        remote.remember(row.bookingAgent.id ?? row.bookingAgentId, label);
        return label;
      }
    }
    return remote.getCachedLabel(row.bookingAgentId);
  }

  return {
    bookingAgentIdToLabel: remote.idToLabel,
    bookingAgentLabelToId: remote.labelToId,
    rememberBookingAgent: remote.remember,
    rememberBookingAgentDto,
    getCachedBookingAgentLabel: remote.getCachedLabel,
    createBookingAgentSource: remote.createSource,
    resolveBookingAgentLabelFromRow,
    clearBookingAgentCache: remote.clearCache,
    formatBookingAgentLabel,
  };
}
