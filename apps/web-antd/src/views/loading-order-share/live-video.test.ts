import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LiveVideo from './live-video.vue';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  viewers: vi.fn(),
  ptz: vi.fn(),
  destroy: vi.fn(),
  handlers: new Map<string, () => void>(),
  create: vi.fn(),
}));
vi.mock('#/api/sea-export/loading-order-video', () => ({
  startLoadingVideo: mocks.start,
  getLoadingVideoViewers: mocks.viewers,
  controlLoadingVideo: mocks.ptz,
  loadingVideoError: (error: Error, fallback: string) =>
    error.message || fallback,
}));
vi.mock('mpegts.js', () => ({
  default: {
    getFeatureList: () => ({ mseLivePlayback: true }),
    Events: { ERROR: 'error', LOADING_COMPLETE: 'complete' },
    createPlayer: mocks.create,
  },
}));
vi.mock('ant-design-vue', () => ({
  Button: { template: '<button><slot /></button>' },
  Spin: { template: '<span>Loading</span>' },
  Tooltip: { props: ['title'], template: '<div><slot /></div>' },
}));

const info = {
  camera: { cameraNo: 1, name: '摄像头1' },
  flvUrl: 'https://backend.test/order.flv',
  viewerCount: 0,
  maxViewerCount: 3,
};
const props = {
  mblNum: 'MBL001',
  loadingOrderNum: 'LO001',
  lang: 'zh' as const,
  completed: false,
  cameraNo: 1,
};
let wrapper: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.handlers.clear();
  mocks.start.mockResolvedValue(info);
  mocks.viewers.mockResolvedValue({ viewerCount: 2, maxViewerCount: 3 });
  mocks.ptz.mockResolvedValue(true);
  mocks.create.mockImplementation(() => ({
    destroy: mocks.destroy,
    attachMediaElement: vi.fn(),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    on: (event: string, callback: () => void) =>
      mocks.handlers.set(event, callback),
  }));
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
});

function overlay() {
  return document.body.querySelector('.live-video__overlay');
}

function overlayText() {
  return overlay()?.textContent ?? '';
}

async function openPlayer() {
  wrapper = mount(LiveVideo, { props, attachTo: document.body });
  await flushPromises();
  await wrapper.get('.live-video__open').trigger('click');
  await flushPromises();
}

describe('监装直播', () => {
  it('有摄像头才展示查看按钮，进入页面不点播', async () => {
    wrapper = mount(LiveVideo, { props });
    await flushPromises();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.viewers).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('查看监装视频');
    expect(wrapper.find('video').exists()).toBe(false);
  });

  it('未绑摄像头不展示按钮，提示暂无视频，悬浮说明原因', async () => {
    wrapper = mount(LiveVideo, { props: { ...props, cameraNo: null } });
    await flushPromises();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(wrapper.find('.live-video__open').exists()).toBe(false);
    expect(wrapper.text()).toContain('暂无现场视频');
    expect(wrapper.get('.live-video__hint-mark').text()).toBe('?');
    expect(wrapper.get('.live-video__hint').attributes('title')).toBe(
      '该监装工单未绑定摄像头,暂无视频',
    );
  });

  it('点查看后点播失败，展示接口报错', async () => {
    mocks.start.mockRejectedValue(new Error('当前已有3人在观看,请稍后再试'));
    await openPlayer();
    expect(overlayText()).toContain('当前已有3人在观看');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('点查看后全屏打开，拿到点播地址但30秒没有首帧，明确提示未收到画面而不是已中断', async () => {
    await openPlayer();
    expect(overlay()).toBeTruthy();
    await vi.advanceTimersByTimeAsync(30_000);
    await flushPromises();
    expect(overlayText()).toContain(
      '等待30秒仍未收到可播放画面，请联系管理员检查摄像头出流与视频转发',
    );
    expect(overlayText()).not.toContain('视频已中断');
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(2);
  });

  it('只使用后端 FLV 地址，10 秒查询连接数，卸载释放连接', async () => {
    await openPlayer();
    overlay()?.querySelector('video')?.dispatchEvent(new Event('playing'));
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      url: info.flvUrl,
      type: 'flv',
      withCredentials: false,
    });
    await vi.advanceTimersByTimeAsync(9999);
    expect(mocks.viewers).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.viewers).toHaveBeenCalledTimes(1);
    wrapper!.unmount();
    wrapper = undefined;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.viewers).toHaveBeenCalledTimes(1);
  });

  it('播放错误只诊断一次，满员不自动重连', async () => {
    await openPlayer();
    mocks.start.mockRejectedValue(new Error('当前已有3人在观看,请稍后再试'));
    mocks.handlers.get('error')?.();
    mocks.handlers.get('error')?.();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(mocks.start).toHaveBeenCalledTimes(2);
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
    expect(overlayText()).toContain('当前已有3人在观看');
  });

  it('关闭页面后迟到的点播结果不会创建播放器', async () => {
    let resolve!: (value: typeof info) => void;
    mocks.start.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await openPlayer();
    wrapper!.unmount();
    wrapper = undefined;
    resolve(info);
    await flushPromises();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('开始云台请求较慢时，松开后仍在开始完成之后发停止', async () => {
    let resolve!: () => void;
    mocks.ptz.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    await openPlayer();
    overlay()?.querySelector('video')?.dispatchEvent(new Event('playing'));
    const left = overlay()?.querySelector(
      'button[aria-label="向左"]',
    ) as HTMLButtonElement;
    left.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await flushPromises();
    left.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }),
    );
    expect(mocks.ptz).toHaveBeenCalledTimes(1);
    resolve();
    await flushPromises();
    expect(mocks.ptz.mock.calls.map(([request]) => request.command)).toEqual([
      1, 0,
    ]);
  });

  it('已完成工单不点播、不提供查看入口', async () => {
    wrapper = mount(LiveVideo, { props: { ...props, completed: true } });
    await flushPromises();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.viewers).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('监装已完成，视频已关闭');
    expect(wrapper.find('.live-video__open').exists()).toBe(false);
  });
});
