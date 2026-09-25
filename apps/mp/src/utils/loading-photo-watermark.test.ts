import { afterEach, expect, it, vi } from 'vitest';

import { useLoadingPhotoWatermark } from './loading-photo-watermark';

afterEach(() => vi.unstubAllGlobals());

function canvasQuery(canvas: any, width = 320, height = 320) {
  const query: any = {
    in: () => query,
    select: () => query,
    fields: () => query,
    exec: (callback: (result: any[]) => void) =>
      callback([{ node: canvas, width, height }]),
  };
  return query;
}

function image() {
  return {
    onload: null as null | (() => void),
    onerror: null as null | (() => void),
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    },
  };
}

function lightRow(width: number) {
  const data = new Uint8ClampedArray(Math.max(1, width) * 4);
  data[0] = 255;
  data[1] = 255;
  data[2] = 255;
  data[3] = 255;
  return { data };
}

it('等画布写出水印白字后才导出', async () => {
  const fillText = vi.fn();
  const exportImage = vi.fn((options) =>
    options.success({ tempFilePath: '/watermarked.jpg' }),
  );
  const context = {
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText,
    measureText: () => ({ width: 400 }),
    getImageData: (_x: number, _y: number, width: number) => lightRow(width),
  };
  const canvas = {
    width: 0,
    height: 0,
    createImage: () => image(),
    getContext: () => context,
  };
  vi.stubGlobal('uni', {
    getImageInfo: (options: any) =>
      options.success({ width: 3000, height: 4000, path: '/original.jpg' }),
    createSelectorQuery: () => canvasQuery(canvas),
    canvasToTempFilePath: exportImage,
  });
  const instance = {};
  const pending = useLoadingPhotoWatermark(instance).watermark(
    '/original.jpg',
    '李师傅',
    {
      address: '山东省青岛市黄岛区测试路1号',
      latitude: 31.2304,
      longitude: 121.4737,
    },
  );
  expect(await pending).toBe('/watermarked.jpg');
  expect(fillText.mock.calls[0]?.[0]).toBe('上传人：李师傅');
  expect(fillText.mock.calls[2]?.[0]).toBe(
    '上传位置：山东省青岛市黄岛区测试路1号',
  );
  expect(exportImage).toHaveBeenCalledWith(
    expect.objectContaining({
      canvas,
      destWidth: 1536,
      destHeight: 2048,
      fileType: 'jpg',
    }),
    instance,
  );
  expect(canvas.width).toBe(1536);
  expect(canvas.height).toBe(2048);
});

it('第一次画布仍是纯色时重画，确认有白字后再导出', async () => {
  let reads = 0;
  const exportImage = vi.fn((options) =>
    options.success({ tempFilePath: '/retried.jpg' }),
  );
  const context = {
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: () => ({ width: 10 }),
    getImageData: (_x: number, _y: number, width: number) => {
      reads += 1;
      if (reads === 1) return { data: new Uint8ClampedArray(width * 4) };
      return lightRow(width);
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    createImage: () => image(),
    getContext: () => context,
  };
  vi.stubGlobal('uni', {
    getImageInfo: (options: any) =>
      options.success({ width: 800, height: 600, path: '/original.jpg' }),
    createSelectorQuery: () => canvasQuery(canvas),
    canvasToTempFilePath: exportImage,
  });
  await expect(
    useLoadingPhotoWatermark({}).watermark('/original.jpg', '李师傅', {
      address: '山东省青岛市黄岛区测试路1号',
      latitude: 31.2304,
      longitude: 121.4737,
    }),
  ).resolves.toBe('/retried.jpg');
  expect(context.drawImage).toHaveBeenCalledTimes(2);
  expect(exportImage).toHaveBeenCalledTimes(1);
});

it('无法读取图片时失败，不回退上传无水印原图', async () => {
  vi.stubGlobal('uni', { getImageInfo: (options: any) => options.fail() });
  await expect(
    useLoadingPhotoWatermark({}).watermark('/bad.jpg', '李师傅', {
      address: '山东省青岛市黄岛区测试路1号',
      latitude: 31.2304,
      longitude: 121.4737,
    }),
  ).rejects.toThrow('无法读取图片');
});

it('未解析出中文地址时禁止生成小程序水印', async () => {
  await expect(
    useLoadingPhotoWatermark({}).watermark('/photo.jpg', '师傅', {
      latitude: 31,
      longitude: 121,
      address: ' ',
    }),
  ).rejects.toThrow('未获取当前位置地址');
});
