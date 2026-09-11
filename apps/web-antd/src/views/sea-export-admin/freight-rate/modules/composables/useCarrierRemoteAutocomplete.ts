import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import {
  getCarrierDetail,
  getCarrierPagedList,
} from '#/api/system/base-data/carrier-admin';

import { useRemoteAutocomplete } from './useRemoteAutocomplete';

/** 与 baseStore 全量缓存一致：`CODE(中文简称)` */
export function formatCarrierLabel(
  carrier?: null | CarrierAdminApi.CarrierDto,
): string {
  if (!carrier) return '';
  const code = (carrier.code || '').toString().trim();
  const cnShortName = (
    carrier.cnShortName ||
    carrier.cnName ||
    carrier.enName ||
    ''
  )
    .toString()
    .trim();
  if (code && cnShortName) return `${code}(${cnShortName})`;
  return cnShortName || code;
}

/**
 * Handsontable 船公司列远程搜索 + 滚动加载更多
 */
export function useCarrierRemoteAutocomplete(options?: {
  pageSize?: number;
  debounceMs?: number;
}) {
  const remote = useRemoteAutocomplete({
    pageSize: options?.pageSize,
    debounceMs: options?.debounceMs,
    async fetchPage(keyword, pageIndex, pageSize) {
      const res = await getCarrierPagedList({
        Keyword: keyword || undefined,
        PageIndex: pageIndex,
        PageSize: pageSize,
      });
      const pairs: Array<{ id: string; label: string }> = [];
      const labels: string[] = [];
      const seen = new Set<string>();
      for (const item of res.items || []) {
        const id = String(item?.id ?? '').trim();
        const label = formatCarrierLabel(item);
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

  function rememberCarrierDto(
    carrier: CarrierAdminApi.CarrierDto | null | undefined,
  ) {
    if (!carrier?.id) return;
    const label = formatCarrierLabel(carrier);
    if (label) remote.remember(carrier.id, label);
  }

  function resolveCarrierLabelFromRow(row: {
    carrierId?: number | string;
    carrier?: CarrierAdminApi.CarrierDto | null;
  }): string {
    if (row.carrier) {
      const label = formatCarrierLabel(row.carrier);
      if (label) {
        remote.remember(row.carrier.id ?? row.carrierId, label);
        return label;
      }
    }
    return remote.getCachedLabel(row.carrierId);
  }

  async function ensureCarrierLabelsByIds(
    ids: Array<number | string | null | undefined>,
  ) {
    const missing = [
      ...new Set(
        ids
          .filter((id) => id !== undefined && id !== null && id !== '')
          .map((id) => String(id))
          .filter((id) => !remote.idToLabel.value.has(id)),
      ),
    ];
    await Promise.all(
      missing.map(async (id) => {
        try {
          const detail = await getCarrierDetail(id);
          rememberCarrierDto(detail);
        } catch (error) {
          console.warn(
            `[carrier autocomplete] detail failed for ${id}:`,
            error,
          );
        }
      }),
    );
  }

  return {
    carrierIdToLabel: remote.idToLabel,
    carrierLabelToId: remote.labelToId,
    rememberCarrier: remote.remember,
    rememberCarrierDto,
    getCachedCarrierLabel: remote.getCachedLabel,
    createCarrierSource: remote.createSource,
    resolveCarrierLabelFromRow,
    ensureCarrierLabelsByIds,
    clearCarrierCache: remote.clearCache,
    formatCarrierLabel,
  };
}
