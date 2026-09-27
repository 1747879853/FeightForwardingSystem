import { afterEach, expect, it, vi } from 'vitest';
import { watch } from 'vue';

import {
  appBackgroundEpoch,
  noteAppHide,
  runDuringNativeOverlay,
} from '@/stores/app-visibility';
import { createLoadingTaskLocation } from '@/utils/loading-task-location';

const position = { latitude: 31, longitude: 121, address: '上海市测试路1号' };

afterEach(() => {
  appBackgroundEpoch.value = 0;
  vi.unstubAllGlobals();
});

it('拍照触发应用 onHide 时保留已显示位置并继续上传', async () => {
  const fetch = vi.fn().mockResolvedValue(position);
  const task = createLoadingTaskLocation(fetch);
  const stop = watch(appBackgroundEpoch, () => task.invalidate(), {
    flush: 'sync',
  });
  task.onPageShow();
  await task.getForUpload();
  vi.stubGlobal('uni', {
    getStorageSync: () => '',
    chooseImage: (options: UniApp.ChooseImageOptions) => {
      noteAppHide();
      options.success?.({ tempFilePaths: ['wxfile://photo.jpg'] });
    },
  });
  const { chooseImages } = await import('@/api/upload');

  await expect(chooseImages(['camera'], 1)).resolves.toEqual([
    'wxfile://photo.jpg',
  ]);
  expect(task.location.value).toEqual(position);
  expect(await task.getForUpload()).toEqual(position);
  task.onPageShow();
  expect(fetch).toHaveBeenCalledTimes(1);
  stop();
});

it('真正离开小程序仍清空位置并阻止上传', async () => {
  const fetch = vi.fn().mockResolvedValue(position);
  const task = createLoadingTaskLocation(fetch);
  const stop = watch(appBackgroundEpoch, () => task.invalidate(), {
    flush: 'sync',
  });
  task.onPageShow();
  await task.getForUpload();
  noteAppHide();
  expect(task.location.value).toBeNull();
  await expect(task.getForUpload()).rejects.toThrow('位置尚未获取');
  stop();
});

it('原生窗口结束后恢复统计后台', async () => {
  const seen: number[] = [];
  const stop = watch(
    appBackgroundEpoch,
    () => {
      seen.push(appBackgroundEpoch.value);
    },
    { flush: 'sync' },
  );
  await runDuringNativeOverlay(async () => {
    noteAppHide();
  });
  expect(seen).toEqual([]);
  noteAppHide();
  expect(appBackgroundEpoch.value).toBe(1);
  stop();
});
