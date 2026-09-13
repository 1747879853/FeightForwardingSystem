import { beforeEach, expect, it, vi } from 'vitest';

import {
  controlLoadingVideo,
  getLoadingVideoViewers,
  loadingVideoError,
  startLoadingVideo,
} from './loading-order-video';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: client }));
beforeEach(() => vi.clearAllMocks());

it('点播免登录并给予设备出流等待时间，保留 Async 后缀', () => {
  const query = { mblNum: 'MBL', loadingOrderNum: 'LO' };
  const controller = new AbortController();
  startLoadingVideo(query, controller.signal);
  expect(client.post).toHaveBeenCalledWith(
    '/services/app/LoadingOrderVideo/StartPlayAsync',
    query,
    {
      skipAuth: true,
      skipErrorMessage: true,
      timeout: 120_000,
      signal: controller.signal,
    },
  );
});

it('人数和停止云台请求只传工单口令，不传租户和设备流标识', () => {
  const query = { mblNum: 'MBL', loadingOrderNum: 'LO' };
  getLoadingVideoViewers(query);
  controlLoadingVideo({ ...query, command: 0 });
  expect(client.get).toHaveBeenCalledWith(
    '/services/app/LoadingOrderVideo/GetViewerCountAsync',
    {
      skipAuth: true,
      skipErrorMessage: true,
      params: query,
      signal: undefined,
    },
  );
  expect(client.post).toHaveBeenCalledWith(
    '/services/app/LoadingOrderVideo/PtzAsync',
    { ...query, command: 0 },
    {
      skipAuth: true,
      skipErrorMessage: true,
      timeout: 15_000,
    },
  );
});

it('点播失败优先读 ABP 响应体里的业务文案', () => {
  expect(
    loadingVideoError(
      {
        error: { message: '该监装工单未绑定摄像头,暂无视频' },
      },
      '视频连接失败，请稍后重试',
    ),
  ).toBe('该监装工单未绑定摄像头,暂无视频');
  expect(
    loadingVideoError(
      { message: 'Request failed with status code 500' },
      '视频连接失败，请稍后重试',
    ),
  ).toBe('视频连接失败，请稍后重试');
});
