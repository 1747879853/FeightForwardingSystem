import { expect, it } from 'vitest';

import { formatLoadingPhotoLocation } from './loading-photo-location';

it('保留经纬度方向和六位小数，零坐标合法', () => {
  expect(formatLoadingPhotoLocation({ latitude: 0, longitude: -73.9857 })).toBe(
    '纬度 0.000000，经度 -73.985700',
  );
});

it.each([
  { latitude: Number.NaN, longitude: 120 },
  { latitude: 31, longitude: Infinity },
  { latitude: 91, longitude: 120 },
  { latitude: 31, longitude: -181 },
])('拒绝无效位置 %j，不能写入伪造位置水印', (location) => {
  expect(() => formatLoadingPhotoLocation(location)).toThrow('未获取有效位置');
});
