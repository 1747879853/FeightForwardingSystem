import { describe, expect, it } from 'vitest';

import { loadingPhotoWatermark } from './loading-photo-watermark';

const location = { latitude: 31.2304, longitude: 121.4737 };

describe('监装照片水印', () => {
  it.each([null, location, { ...location, address: '测试地址'.repeat(20) }])(
    '两行、多行水印的文字组上下留白一致',
    (position) => {
      const result = loadingPhotoWatermark(1200, 800, '张师傅', position);
      const firstCenter = result.padding + result.fontSize / 2;
      const lastCenter =
        firstCenter + (result.lines.length - 1) * result.lineHeight;
      expect(firstCenter - result.fontSize / 2).toBeCloseTo(
        result.bandHeight - lastCenter - result.fontSize / 2,
      );
    },
  );
  it('中文地址完整换行显示，不再显示坐标且水印不超出画布', () => {
    const address =
      '山东省青岛市黄岛区前湾港路测试物流园区监装作业区一号仓库装卸平台';
    const result = loadingPhotoWatermark(1200, 800, '张师傅', {
      ...location,
      address,
    });
    expect(result.lines.slice(2).join('')).toBe(`上传位置：${address}`);
    expect(result.lines.length).toBeGreaterThan(3);
    expect(result.bandHeight).toBeLessThan(800 / 2);
  });

  it('PC 明确不使用位置，只生成上传人和时间两行水印', () => {
    const result = loadingPhotoWatermark(1200, 800, '上传人', null);
    expect(result.lines).toHaveLength(2);
    expect(result.lines.some((line) => line.includes('位置'))).toBe(false);
    const mobile = loadingPhotoWatermark(1200, 800, '上传人', location);
    expect(result.bandHeight).toBeLessThan(mobile.bandHeight);
  });

  it('小程序传入无效坐标仍拒绝生成水印', () => {
    expect(() =>
      loadingPhotoWatermark(1200, 800, '上传人', {
        latitude: Number.NaN,
        longitude: 121,
      }),
    ).toThrow('未获取有效位置');
  });

  it('统一北京时间，正确处理跨日且保留上传人', () => {
    const result = loadingPhotoWatermark(
      4000,
      3000,
      ' 张师傅 ',
      location,
      new Date('2026-09-18T18:01:02Z'),
    );
    expect(result.lines).toEqual([
      '上传人：张师傅',
      '上传时间：2026-09-19 02:01:02（北京时间）',
      '上传位置：纬度 31.230400，经度 121.473700',
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
      const result = loadingPhotoWatermark(width, height, '上传人', location);
      expect([result.width, result.height]).toEqual([width, height]);
      expect(result.bandHeight).toBeLessThan(height);
      expect(result.fontSize).toBeGreaterThan(0);
    },
  );

  it('缺少真实上传人或尺寸无效时不允许生成无身份图片', () => {
    expect(() => loadingPhotoWatermark(100, 100, ' ', location)).toThrow(
      '无法获取上传人',
    );
    expect(() => loadingPhotoWatermark(0, 100, '张师傅', location)).toThrow(
      '图片尺寸无效',
    );
  });
});
