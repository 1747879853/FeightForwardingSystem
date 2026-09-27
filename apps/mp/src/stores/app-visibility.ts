import { ref } from 'vue';

/**
 * 只由真正离开小程序的 App.onHide 更新。
 * 拍照、相册、预览会让微信触发 App.onHide，这段时间不计入，避免清掉已显示的任务位置。
 */
export const appBackgroundEpoch = ref(0);

let nativeOverlayDepth = 0;

/** 相机、相册、图片预览打开期间调用。 */
export function runDuringNativeOverlay<T>(task: () => Promise<T>) {
  nativeOverlayDepth += 1;
  return Promise.resolve()
    .then(task)
    .finally(() => {
      nativeOverlayDepth -= 1;
    });
}

export function noteAppHide() {
  if (nativeOverlayDepth > 0) return;
  appBackgroundEpoch.value += 1;
}
