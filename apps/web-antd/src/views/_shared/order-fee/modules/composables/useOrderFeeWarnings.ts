import type { MaybeRefOrGetter } from 'vue';

import { computed, ref, toValue, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

import {
  buildOrderFeeWarningDisplayItems,
  type OrderFeeWarningDisplayItem,
} from '../utils/order-fee-warning-messages';

export type OrderFeeWarningFetcher = (
  params: OrderFeeAdminApi.OrderFeeWarningQueryDto,
) => Promise<OrderFeeAdminApi.OrderFeeWarningGroupDto[]>;

/**
 * 费用预警：按 transportOrderId（+ 可选 changeOrderId）拉取，
 * 再按 paySide 拆成应收 / 应付 / 不分收付三组展示项。
 */
export function useOrderFeeWarnings(options: {
  transportOrderId: MaybeRefOrGetter<null | string | undefined>;
  changeOrderId?: MaybeRefOrGetter<null | string | undefined>;
  /** 未提供 fetcher 时不请求 */
  fetcher?: OrderFeeWarningFetcher | null;
  /** 表格频繁 change 时合并请求 */
  debounceMs?: number;
}) {
  const warnings = ref<OrderFeeAdminApi.OrderFeeWarningGroupDto[]>([]);
  const loading = ref(false);
  let requestSeq = 0;

  const displayItems = computed(() =>
    buildOrderFeeWarningDisplayItems(warnings.value),
  );

  const receivableWarnings = computed(() =>
    displayItems.value.filter((w) => w.paySide === 0),
  );

  const payableWarnings = computed(() =>
    displayItems.value.filter((w) => w.paySide === 1),
  );

  /** paySide 为 null / undefined 的汇总类预警 */
  const sharedWarnings = computed(() =>
    displayItems.value.filter((w) => w.paySide !== 0 && w.paySide !== 1),
  );

  /** @deprecated 兼容旧字符串列表用法 */
  const receivableMessages = computed(() =>
    receivableWarnings.value.map((w) =>
      w.details.length
        ? `${w.message}：${w.details.map((d) => d.label).join('、')}`
        : w.message,
    ),
  );

  const payableMessages = computed(() =>
    payableWarnings.value.map((w) =>
      w.details.length
        ? `${w.message}：${w.details.map((d) => d.label).join('、')}`
        : w.message,
    ),
  );

  const sharedMessages = computed(() =>
    sharedWarnings.value.map((w) =>
      w.details.length
        ? `${w.message}：${w.details.map((d) => d.label).join('、')}`
        : w.message,
    ),
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
    displayItems,
    receivableWarnings,
    payableWarnings,
    sharedWarnings,
    receivableMessages,
    payableMessages,
    sharedMessages,
    fetchWarnings,
    refreshWarnings,
  };
}

export type { OrderFeeWarningDisplayItem };
