import { ref } from 'vue';

import { getLoadingPhotoLocation } from './loading-photo-location';

export type TaskPhotoLocation = Awaited<
  ReturnType<typeof getLoadingPhotoLocation>
>;

/** 每个详情实例独立保存位置，上传只读取，不触发新的定位请求。 */
export function createLoadingTaskLocation(
  fetchLocation = getLoadingPhotoLocation,
) {
  const location = ref<TaskPhotoLocation | null>(null);
  const loading = ref(false);
  const error = ref('');
  let generation = 0;
  let needsRefresh = true;
  let pending: Promise<void> | undefined;

  function invalidate() {
    generation += 1;
    needsRefresh = true;
    location.value = null;
    loading.value = false;
    error.value = '';
    pending = undefined;
  }

  function refresh() {
    if (pending) return pending;
    const requestGeneration = ++generation;
    needsRefresh = false;
    location.value = null;
    loading.value = true;
    error.value = '';
    pending = Promise.resolve()
      .then(fetchLocation)
      .then((result) => {
        if (generation === requestGeneration) location.value = result;
      })
      .catch((cause) => {
        if (generation === requestGeneration)
          error.value =
            cause instanceof Error ? cause.message : '位置获取失败，请重试';
      })
      .finally(() => {
        if (generation === requestGeneration) {
          loading.value = false;
          pending = undefined;
        }
      });
    return pending;
  }

  function onPageShow() {
    if (needsRefresh) void refresh();
  }

  /** 必须由用户点击触发，拒绝过的权限不能靠再次定位重新弹窗。 */
  function openLocationSettings() {
    uni.openSetting({
      success: (result) => {
        invalidate();
        if (result.authSetting['scope.userLocation']) {
          void refresh();
        } else {
          needsRefresh = false;
          error.value = '尚未开启位置权限';
        }
      },
      fail: () => {
        uni.showToast({
          icon: 'none',
          title: '请通过右上角“…”→设置→位置信息开启权限',
        });
      },
    });
  }

  async function getForUpload(): Promise<TaskPhotoLocation> {
    const expectedGeneration = generation;
    await pending;
    if (generation !== expectedGeneration || !location.value) {
      throw new Error(
        error.value || '位置尚未获取，请等待定位完成或点击重新定位',
      );
    }
    return location.value;
  }

  return {
    location,
    loading,
    error,
    refresh,
    invalidate,
    onPageShow,
    openLocationSettings,
    getForUpload,
  };
}
