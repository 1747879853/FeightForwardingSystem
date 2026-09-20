import type { OrderAdjacentIds } from '#/utils/order-adjacent-query';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { normalizeAdjacentId } from '#/utils/order-adjacent-query';

/**
 * 海出 / 海进 / 空出编辑工作台共用的上一票 / 下一票。
 * 跳转走现有路由，未保存离开由 `useUnsavedGuard` 拦截。
 */
export function useOrderAdjacentNav(options: { routeName: string }) {
  const router = useRouter();
  const previousId = ref<null | string>(null);
  const nextId = ref<null | string>(null);
  const navigating = ref(false);

  const canGoPrev = computed(() => !!previousId.value);
  const canGoNext = computed(() => !!nextId.value);

  function applyAdjacentFromDetail(detail?: null | OrderAdjacentIds) {
    previousId.value = normalizeAdjacentId(detail?.previousId);
    nextId.value = normalizeAdjacentId(detail?.nextId);
  }

  async function goTo(id: null | string) {
    if (!id || navigating.value) {
      return;
    }
    navigating.value = true;
    try {
      await router.push({ name: options.routeName, params: { id } });
    } finally {
      navigating.value = false;
    }
  }

  return {
    applyAdjacentFromDetail,
    canGoNext,
    canGoPrev,
    goNext: () => goTo(nextId.value),
    goPrev: () => goTo(previousId.value),
    navigating,
    nextId,
    previousId,
  };
}
