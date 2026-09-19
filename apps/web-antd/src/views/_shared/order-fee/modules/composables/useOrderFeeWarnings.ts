import type { MaybeRefOrGetter } from 'vue';

import { computed, ref, toValue, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

import { getOrderFeeWarningMessage } from '../utils/order-fee-warning-messages';

export type OrderFeeWarningFetcher = (
  params: OrderFeeAdminApi.OrderFeeWarningQueryDto,
) => Promise<OrderFeeAdminApi.OrderFeeWarningDto[]>;

/**
 * 费用预警：按 transportOrderId（+ 可选 changeOrderId）拉取，
 * 再按 paySide 拆成应收 / 应付 / 不分收付三组文案。
 */
export function useOrderFeeWarnings(options: {
  transportOrderId: MaybeRefOrGetter<null | string | undefined>;
  changeOrderId?: MaybeRefOrGetter<null | string | undefined>;
  /** 未提供 fetcher 时不请求（例如非海出模块） */
  fetcher?: OrderFeeWarningFetcher | null;
  /** 表格频繁 change 时合并请求 */
  debounceMs?: number;
}) {
  const warnings = ref<OrderFeeAdminApi.OrderFeeWarningDto[]>([]);
  const loading = ref(false);
  let requestSeq = 0;

  const receivableMessages = computed(() =>
    warnings.value
      .filter((w) => w.paySide === 0)
      .map((w) => getOrderFeeWarningMessage(w.type)),
  );

  const payableMessages = computed(() =>
    warnings.value
      .filter((w) => w.paySide === 1)
      .map((w) => getOrderFeeWarningMessage(w.type)),
  );

  /** paySide 为 null / undefined 的汇总类预警 */
  const sharedMessages = computed(() =>
    warnings.value
      .filter((w) => w.paySide !== 0 && w.paySide !== 1)
      .map((w) => getOrderFeeWarningMessage(w.type)),
  );

  async function fetchWarnings() {
    const fetcher = options.fetcher;
    const transportOrderId = String(
      toValue(options.transportOrderId) ?? '',
    ).trim();
    if (!fetcher || !transportOrderId) {
      warnings.value = [];
      return;
    }

    const rawChangeOrderId = toValue(options.changeOrderId);
    const changeOrderId = String(rawChangeOrderId ?? '').trim();
    const seq = ++requestSeq;
    loading.value = true;
    try {
      const list = await fetcher({
        transportOrderId,
        ...(changeOrderId ? { changeOrderId } : {}),
      });
      if (seq !== requestSeq) return;
      warnings.value = Array.isArray(list) ? list : [];
    } catch (error) {
      if (seq !== requestSeq) return;
      console.error('[order-fee] 拉取费用预警失败:', error);
      warnings.value = [];
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  const refreshWarnings = useDebounceFn(
    fetchWarnings,
    options.debounceMs ?? 400,
  );

  watch(
    () => [
      toValue(options.transportOrderId),
      toValue(options.changeOrderId),
      options.fetcher,
    ],
    () => {
      void fetchWarnings();
    },
    { immediate: true },
  );

  return {
    warnings,
    loading,
    receivableMessages,
    payableMessages,
    sharedMessages,
    fetchWarnings,
    refreshWarnings,
  };
}
