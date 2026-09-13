import { beforeEach, expect, it, vi } from 'vitest';

import {
  editLoadingOrderCameraNo,
  getLoadingOrderCameraList,
} from './loading-order';

const request = vi.hoisted(() => vi.fn());
vi.mock('./request', () => ({ request }));
beforeEach(() => vi.clearAllMocks());

it('摄像头列表按工单 id 查询，保留 Async 后缀', () => {
  getLoadingOrderCameraList('order-id');
  expect(request).toHaveBeenCalledWith({
    url: '/services/app/LoadingOrder/GetCameraListAsync',
    params: { id: 'order-id' },
  });
});

it('摄像头认领只提交工单 id 和选中编号，保留 Async 后缀', () => {
  editLoadingOrderCameraNo('order-id', 17);
  expect(request).toHaveBeenCalledWith({
    url: '/services/app/LoadingOrder/EditCameraNoAsync',
    method: 'PUT',
    data: { id: 'order-id', cameraNo: 17 },
  });
});

it('解绑显式提交 null，不省略摄像头编号字段', () => {
  editLoadingOrderCameraNo('order-id', null);
  expect(request).toHaveBeenCalledWith({
    url: '/services/app/LoadingOrder/EditCameraNoAsync',
    method: 'PUT',
    data: { id: 'order-id', cameraNo: null },
  });
});
