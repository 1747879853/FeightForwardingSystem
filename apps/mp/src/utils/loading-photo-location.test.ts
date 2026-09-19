import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { getLoadingPhotoLocation } from './loading-photo-location';

beforeEach(() => vi.stubEnv('VITE_QQMAP_KEY', 'test-key'));
const address = '山东省青岛市黄岛区测试路1号';
const reverse = vi.fn((options: any) =>
  options.success({
    statusCode: 200,
    data: { status: 0, result: { address } },
  }),
);

afterEach(() => {
  vi.unstubAllEnvs();
  reverse.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('定位后用 GCJ-02 解析完整中文地址，下一批重新定位', async () => {
  const request = vi.fn((options) =>
    options.success({ latitude: 31, longitude: 121 }),
  );
  vi.stubGlobal('uni', { getLocation: request, request: reverse });
  expect(await getLoadingPhotoLocation()).toEqual({
    address,
    latitude: 31,
    longitude: 121,
  });
  expect(request.mock.calls[0]?.[0].type).toBe('gcj02');
  expect(reverse.mock.calls[0]?.[0].data).toEqual({
    key: 'test-key',
    location: '31,121',
    get_poi: 0,
  });
  request.mockImplementation((options) =>
    options.success({ latitude: 32, longitude: 122 }),
  );
  expect(await getLoadingPhotoLocation()).toEqual({
    address,
    latitude: 32,
    longitude: 122,
  });
});

it('位置权限拒绝时中止，不返回占位地址', async () => {
  vi.stubGlobal('uni', {
    getLocation: (options: any) => options.fail({ errMsg: 'auth deny' }),
  });
  await expect(getLoadingPhotoLocation()).rejects.toThrow('位置权限');
});

it('平台不回调时超时释放上传等待', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('uni', { getLocation: vi.fn() });
  const assertion = expect(getLoadingPhotoLocation()).rejects.toThrow(
    '定位超时',
  );
  await vi.advanceTimersByTimeAsync(20000);
  await assertion;
});

it.each([
  { statusCode: 200, data: { status: 121 } },
  { statusCode: 200, data: { status: 0, result: { address: ' ' } } },
  { statusCode: 500, data: { status: 0, result: { address } } },
])('地址解析失败不退回坐标上传 %j', async (response) => {
  vi.stubGlobal('uni', {
    getLocation: (options: any) =>
      options.success({ latitude: 31, longitude: 121 }),
    request: (options: any) => options.success(response),
  });
  await expect(getLoadingPhotoLocation()).rejects.toThrow('地址解析失败');
});

it('缺少 Key 时明确阻止上传', async () => {
  vi.stubEnv('VITE_QQMAP_KEY', '');
  await expect(getLoadingPhotoLocation()).rejects.toThrow('地址服务未配置');
});

it('地址请求超时不放行上传', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('uni', {
    getLocation: (options: any) =>
      options.success({ latitude: 31, longitude: 121 }),
    request: vi.fn(),
  });
  const assertion = expect(getLoadingPhotoLocation()).rejects.toThrow(
    '地址解析超时',
  );
  await vi.advanceTimersByTimeAsync(12000);
  await assertion;
});
