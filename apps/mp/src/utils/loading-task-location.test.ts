import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

import {
  createLoadingTaskLocation,
  type TaskPhotoLocation,
} from './loading-task-location';

const position = { latitude: 31, longitude: 121, address: '上海市测试路1号' };

it('拒绝后手动开启权限会重新定位并恢复上传', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error('定位拒绝'))
    .mockResolvedValueOnce(position);
  const task = createLoadingTaskLocation(fetch);
  await task.refresh();
  vi.stubGlobal('uni', {
    openSetting: ({ success }: UniApp.OpenSettingOptions) =>
      success?.({ authSetting: { 'scope.userLocation': true } }),
  });
  task.openLocationSettings();
  expect(await task.getForUpload()).toEqual(position);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('设置返回仍未授权时清空旧地址且继续阻止上传', async () => {
  const fetch = vi.fn().mockResolvedValue(position);
  const task = createLoadingTaskLocation(fetch);
  await task.refresh();
  vi.stubGlobal('uni', {
    openSetting: ({ success }: UniApp.OpenSettingOptions) =>
      success?.({ authSetting: { 'scope.userLocation': false } }),
  });
  task.openLocationSettings();
  task.onPageShow();
  await expect(task.getForUpload()).rejects.toThrow('尚未开启位置权限');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('无法打开设置时提供右上角手动操作路径', () => {
  const showToast = vi.fn();
  vi.stubGlobal('uni', {
    showToast,
    openSetting: ({ fail }: UniApp.OpenSettingOptions) =>
      fail?.({ errMsg: 'openSetting:fail' }),
  });
  createLoadingTaskLocation().openLocationSettings();
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({ title: expect.stringContaining('右上角') }),
  );
});

function deferred() {
  let resolve!: (value: TaskPhotoLocation) => void;
  const promise = new Promise<TaskPhotoLocation>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it('首次进入定位一次，同任务跨箱、多次上传及相册返回都复用地址', async () => {
  const fetch = vi.fn().mockResolvedValue(position);
  const task = createLoadingTaskLocation(fetch);
  task.onPageShow();
  expect(await task.getForUpload()).toEqual(position);
  task.onPageShow();
  expect(await task.getForUpload()).toEqual(position);
  expect(await task.getForUpload()).toEqual(position);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('后台立即清空旧位置，重新前台时刷新一次，等待中的上传复用该请求', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(position);
  const task = createLoadingTaskLocation(fetch);
  task.onPageShow();
  await task.getForUpload();
  task.invalidate();
  expect(task.location.value).toBeNull();
  await expect(task.getForUpload()).rejects.toThrow('位置尚未获取');
  const next = deferred();
  fetch.mockReturnValue(next.promise);
  task.onPageShow();
  task.onPageShow();
  const uploading = task.getForUpload();
  next.resolve({ ...position, address: '新地址' });
  expect((await uploading).address).toBe('新地址');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('刷新失败不能用旧地址上传，手动重试成功后恢复', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(position)
    .mockRejectedValueOnce(new Error('定位拒绝'))
    .mockResolvedValueOnce(position);
  const task = createLoadingTaskLocation(fetch);
  task.onPageShow();
  await task.getForUpload();
  task.invalidate();
  task.onPageShow();
  await expect(task.getForUpload()).rejects.toThrow('定位拒绝');
  expect(task.location.value).toBeNull();
  task.onPageShow();
  expect(fetch).toHaveBeenCalledTimes(2);
  await task.refresh();
  expect(await task.getForUpload()).toEqual(position);
});

it('旧定位请求迟到不能覆盖后台返回后更新的位置', async () => {
  const first = deferred();
  const second = deferred();
  const fetch = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const task = createLoadingTaskLocation(fetch);
  task.onPageShow();
  await Promise.resolve();
  const oldUpload = expect(task.getForUpload()).rejects.toThrow();
  task.invalidate();
  task.onPageShow();
  second.resolve({ ...position, address: '新地址' });
  expect((await task.getForUpload()).address).toBe('新地址');
  first.resolve(position);
  await oldUpload;
  expect(task.location.value?.address).toBe('新地址');
});

it('离开任务后旧结果不落地，另一个详情实例独立定位', async () => {
  const first = deferred();
  const fetch = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce(position);
  const task = createLoadingTaskLocation(fetch);
  task.onPageShow();
  await Promise.resolve();
  task.invalidate();
  first.resolve(position);
  await Promise.resolve();
  expect(task.location.value).toBeNull();
  const nextTask = createLoadingTaskLocation(fetch);
  nextTask.onPageShow();
  expect(await nextTask.getForUpload()).toEqual(position);
  expect(fetch).toHaveBeenCalledTimes(2);
});
