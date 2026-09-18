import { describe, expect, it } from 'vitest';

import { loadingPhotoWatermark } from './loading-photo-watermark';

describe('监装照片水印', () => {
  it('统一北京时间，正确处理跨日且保留上传人', () => {
    const result = loadingPhotoWatermark(
      4000,
      3000,
      ' 张师傅 ',
      new Date('2026-09-18T18:01:02Z'),
    );
    expect(result.lines).toEqual([
      '上传人：张师傅',
      '上传时间：2026-09-19 02:01:02（北京时间）',
    ]);
    expect([result.width, result.height]).toEqual([2048, 1536]);
  });

  it.each([
    [600, 1200],
    [1600, 200],
    [120, 120],
  ])(
    '不同画幅 %s × %s 保持比例、不放大小图，水印留在画面内',
    (width, height) => {
      const result = loadingPhotoWatermark(width, height, '上传人');
      expect([result.width, result.height]).toEqual([width, height]);
      expect(result.bandHeight).toBeLessThan(height);
      expect(result.fontSize).toBeGreaterThan(0);
    },
  );

  it('缺少真实上传人或尺寸无效时不允许生成无身份图片', () => {
    expect(() => loadingPhotoWatermark(100, 100, ' ')).toThrow(
      '无法获取上传人',
    );
    expect(() => loadingPhotoWatermark(0, 100, '张师傅')).toThrow(
      '图片尺寸无效',
    );
  });
});
