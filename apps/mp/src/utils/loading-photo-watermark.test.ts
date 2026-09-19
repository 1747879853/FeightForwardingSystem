import { afterEach, expect, it, vi } from 'vitest';

import { useLoadingPhotoWatermark } from './loading-photo-watermark';

afterEach(() => vi.unstubAllGlobals());

it('等待画布绘制结束后才导出，上传使用生成的水印文件', async () => {
  let drawn: (() => void) | undefined;
  const fillText = vi.fn();
  const exportImage = vi.fn((options) =>
    options.success({ tempFilePath: '/watermarked.jpg' }),
  );
  const context = {
    setFillStyle: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    setTextBaseline: vi.fn(),
    setFontSize: vi.fn(),
    fillText,
    measureText: () => ({ width: 400 }),
    draw: (_reserve: boolean, callback: () => void) => {
      drawn = callback;
    },
  };
  vi.stubGlobal('uni', {
    getImageInfo: (options: any) =>
      options.success({ width: 3000, height: 4000, path: '/original.jpg' }),
    createCanvasContext: () => context,
    canvasToTempFilePath: exportImage,
  });
  const instance = {};
  const { watermark } = useLoadingPhotoWatermark(instance);
  const pending = watermark('/original.jpg', '李师傅', {
    address: '山东省青岛市黄岛区测试路1号',
    latitude: 31.2304,
    longitude: 121.4737,
  });
  await vi.waitFor(() => expect(drawn).toBeTypeOf('function'));
  expect(exportImage).not.toHaveBeenCalled();
  drawn!();
  expect(await pending).toBe('/watermarked.jpg');
  expect(fillText.mock.calls[0]?.[0]).toBe('上传人：李师傅');
  expect(fillText.mock.calls[2]?.[0]).toBe(
    '上传位置：山东省青岛市黄岛区测试路1号',
  );
  expect(exportImage).toHaveBeenCalledWith(
    expect.objectContaining({
      destWidth: 1536,
      destHeight: 2048,
      fileType: 'jpg',
    }),
    instance,
  );
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
