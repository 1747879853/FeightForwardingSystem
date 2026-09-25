import { afterEach, expect, it, vi } from 'vitest';
import { shallowRef } from 'vue';

import { useLoadingPhotoWatermark } from './loading-photo-watermark';

afterEach(() => vi.unstubAllGlobals());

function painter() {
  const pending: Array<{
    success: (result: { tempFilePath: string }) => void;
  }> = [];
  return {
    render: vi.fn(async (_board: object) => {
      await Promise.resolve();
      pending
        .splice(0)
        .forEach((task) => task.success({ tempFilePath: '/watermarked.jpg' }));
    }),
    canvasToTempFilePathSync(options: {
      success: (result: { tempFilePath: string }) => void;
    }) {
      pending.push(options);
    },
  };
}

function imageInfo() {
  vi.stubGlobal('uni', {
    getImageInfo: (options: any) =>
      options.success({ width: 3000, height: 4000, path: '/original.jpg' }),
  });
}

const location = {
  address: '山东省青岛市黄岛区测试路1号',
  latitude: 31.2304,
  longitude: 121.4737,
};

it('把照片和上传信息交给画板，并使用导出的水印文件', async () => {
  imageInfo();
  const board = painter();
  const path = await useLoadingPhotoWatermark(shallowRef(board)).watermark(
    '/original.jpg',
    '李师傅',
    location,
  );
  expect(path).toBe('/watermarked.jpg');
  expect(board.render).toHaveBeenCalledWith(
    expect.objectContaining({
      views: expect.arrayContaining([
        expect.objectContaining({
          type: 'image',
          src: '/original.jpg',
          css: expect.objectContaining({ width: '1536px', height: '2048px' }),
        }),
      ]),
    }),
  );
  const schema = JSON.stringify(board.render.mock.calls[0]?.[0]);
  expect(schema).toContain('上传人：李师傅');
  expect(schema).toContain('上传时间：');
  expect(schema).toContain('上传位置：山东省青岛市黄岛区测试路1号');
});

it('无法读取图片时失败，不回退上传无水印原图', async () => {
  vi.stubGlobal('uni', { getImageInfo: (options: any) => options.fail() });
  const board = painter();
  await expect(
    useLoadingPhotoWatermark(shallowRef(board)).watermark(
      '/bad.jpg',
      '李师傅',
      location,
    ),
  ).rejects.toThrow('无法读取图片');
  expect(board.render).not.toHaveBeenCalled();
});

it('未解析出中文地址时禁止生成小程序水印', async () => {
  const board = painter();
  await expect(
    useLoadingPhotoWatermark(shallowRef(board)).watermark(
      '/photo.jpg',
      '师傅',
      {
        latitude: 31,
        longitude: 121,
        address: ' ',
      },
    ),
  ).rejects.toThrow('未获取当前位置地址');
  expect(board.render).not.toHaveBeenCalled();
});
