import { ref } from 'vue';

import type { VendorTrackingMapPayload } from './vendor-map-src';

/**
 * 新服务商轨迹地图全局单例弹窗状态（与货物轨迹弹窗同一模式）。
 * 模块级 ref 共享，弹窗本体挂在 `app.vue`，任意页面调 `open()` 即可。
 */
const visible = ref(false);
const payload = ref<null | VendorTrackingMapPayload>(null);

function open(params: VendorTrackingMapPayload) {
  payload.value = params;
  visible.value = true;
}

function close() {
  visible.value = false;
  payload.value = null;
}

export function useVendorTrackingMap() {
  return {
    visible,
    payload,
    open,
    close,
  };
}
