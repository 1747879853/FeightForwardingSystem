import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/utils/safe-json', () => ({ parseJsonSafe: JSON.parse }));

beforeEach(() => {
  vi.resetModules();
  let token = 'expired-token';
  vi.stubGlobal('getCurrentPages', () => []);
  vi.stubGlobal('uni', {
    getStorageSync: vi.fn(() => token),
    setStorageSync: vi.fn((_key, value) => {
      token = value;
    }),
    removeStorageSync: vi.fn(() => {
      token = '';
    }),
    request: vi.fn((options) =>
      options.success({
        statusCode: 401,
        data: {
          success: false,
          unAuthorizedRequest: true,
          error: { message: '当前用户没有登录到系统' },
        },
      }),
    ),
    reLaunch: vi.fn(),
  });
});

it('失效会话收到 401 时同时清理缓存和页面使用的登录态，阻止登录页跳回列表', async () => {
  const { authState, isLoggedIn, restoreSession } = await import('./auth');
  const { getAccessToken } = await import('../api/request');
  expect(isLoggedIn()).toBe(true);
  await restoreSession();
  expect(getAccessToken()).toBe('');
  expect(authState.token).toBe('');
  expect(isLoggedIn()).toBe(false);
  expect(authState.profile).toBeNull();
  expect(authState.ready).toBe(true);
});

it('登录接口成功但个人信息返回 401 时，不得报告登录成功', async () => {
  const { loginByPassword, isLoggedIn } = await import('./auth');
  vi.mocked(uni.request).mockImplementationOnce((options: any) => {
    options.success({
      statusCode: 200,
      data: { success: true, result: { accessToken: 'new-token' } },
    });
    return {} as any;
  });
  await expect(loginByPassword('test', 'test')).rejects.toMatchObject({
    unauthorized: true,
  });
  expect(isLoggedIn()).toBe(false);
});

it('已经位于登录页时，401 不再重新打开登录页', async () => {
  vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/login/index' }]);
  const { restoreSession } = await import('./auth');
  await restoreSession();
  expect(uni.reLaunch).not.toHaveBeenCalled();
});

it('个人信息普通错误不清理有效会话', async () => {
  const { restoreSession, isLoggedIn } = await import('./auth');
  vi.mocked(uni.request).mockImplementationOnce((options: any) => {
    options.success({ statusCode: 500, data: { success: false } });
    return {} as any;
  });
  await restoreSession();
  expect(isLoggedIn()).toBe(true);
  expect(uni.reLaunch).not.toHaveBeenCalled();
});
