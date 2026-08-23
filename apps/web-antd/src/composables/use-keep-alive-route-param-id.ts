import type { Ref } from 'vue';

import { onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

/**
 * KeepAlive 页面用的路由 id。
 *
 * 当前页可见时跟着 `params` 走；被缓存藏起来后冻结上次的值。
 * 避免海进/海出/空运等同样叫 `:id` 的编辑页，切走后误用别人地址栏里的单号去拉详情。
 */
export function useKeepAliveRouteParamId(
  paramName = 'id',
): Ref<string | undefined> {
  const route = useRoute();
  const isActive = ref(true);
  const id = ref<string | undefined>(undefined);

  const read = () => {
    const raw = route.params[paramName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? String(value) : undefined;
  };

  const sync = () => {
    if (!isActive.value) return;
    id.value = read();
  };

  sync();

  watch(
    () => route.params[paramName],
    () => sync(),
  );

  onActivated(() => {
    isActive.value = true;
    sync();
  });

  onDeactivated(() => {
    isActive.value = false;
  });

  return id;
}
