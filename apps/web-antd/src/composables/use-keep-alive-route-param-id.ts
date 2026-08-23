import type { Ref } from 'vue';

import { onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

/**
 * KeepAlive 页面用的路由 id。
 *
 * 只认「本实例挂上时的那条 path」。路由已经切走时（哪怕 KeepAlive 还没
 * onDeactivated）也不跟着 `params.id` 走，避免海进/海出/空出/费用模板
 * 等同名 `:id` 页互相抢详情。
 */
export function useKeepAliveRouteParamId(
  paramName = 'id',
): Ref<string | undefined> {
  const route = useRoute();
  const isActive = ref(true);
  const id = ref<string | undefined>(undefined);
  const ownedPath = ref(route.path);

  const read = () => {
    const raw = route.params[paramName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? String(value) : undefined;
  };

  const sync = () => {
    if (!isActive.value) return;
    if (route.path !== ownedPath.value) return;
    id.value = read();
  };

  sync();

  watch(
    () => [route.path, route.params[paramName]] as const,
    () => sync(),
  );

  onActivated(() => {
    isActive.value = true;
    ownedPath.value = route.path;
    sync();
  });

  onDeactivated(() => {
    isActive.value = false;
  });

  return id;
}
