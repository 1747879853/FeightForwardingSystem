import { expect, it } from 'vitest';

import { canSelectCamera, cameraOccupiedText } from './camera-options';

it('占用摄像头不可选，当前绑定仍可选', () => {
  expect(
    canSelectCamera({
      cameraNo: 2,
      isOccupied: true,
      name: '摄像头2',
    }),
  ).toBe(false);
  expect(
    canSelectCamera({
      cameraNo: 1,
      isCurrent: true,
      isOccupied: false,
      name: '摄像头1',
    }),
  ).toBe(true);
});

it('同公司占用显示工单号，跨公司不泄露单号', () => {
  expect(
    cameraOccupiedText({
      cameraNo: 2,
      isOccupied: true,
      name: '摄像头2',
      occupiedLoadingOrderNum: 'JZ2026090001',
    }),
  ).toBe('已被 JZ2026090001 占用');
  expect(
    cameraOccupiedText({
      cameraNo: 3,
      isOccupied: true,
      name: '摄像头3',
      occupiedLoadingOrderNum: null,
    }),
  ).toBe('已被其它工单占用');
});
