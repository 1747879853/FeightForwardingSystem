import type { LoadingPhotoLocation } from '../../../shared/loading-photo-location';

import { formatLoadingPhotoLocation } from '../../../shared/loading-photo-location';

/** 定位请求本身不缓存；由详情页控制刷新时机，不降级为无位置上传。 */
async function getCoordinates(): Promise<LoadingPhotoLocation> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('定位超时，请重试')),
      20000,
    );
    try {
      uni.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 8000,
        success: (result) => {
          clearTimeout(timer);
          const location = {
            latitude: result.latitude,
            longitude: result.longitude,
          };
          try {
            formatLoadingPhotoLocation(location);
            resolve(location);
          } catch (error) {
            reject(error);
          }
        },
        fail: () => {
          clearTimeout(timer);
          reject(new Error('定位失败，请检查位置权限'));
        },
      });
    } catch {
      clearTimeout(timer);
      reject(new Error('定位不可用，请检查位置权限'));
    }
  });
}

/** 复用堆场导航的腾讯 WebService Key，每次任务位置刷新解析一次。 */
export async function getLoadingPhotoLocation(): Promise<
  LoadingPhotoLocation & { address: string }
> {
  const key = String(import.meta.env.VITE_QQMAP_KEY ?? '').trim();
  if (!key) throw new Error('地址服务未配置，请联系管理员');
  const location = await getCoordinates();
  const address = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('地址解析超时，请重新定位')),
      12000,
    );
    try {
      uni.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        method: 'GET',
        timeout: 10000,
        data: {
          key,
          location: `${location.latitude},${location.longitude}`,
          get_poi: 0,
        },
        success: (response) => {
          clearTimeout(timer);
          const data = response.data as {
            status?: number;
            result?: { address?: unknown };
          } | null;
          const value = data?.result?.address;
          if (
            response.statusCode === 200 &&
            data?.status === 0 &&
            typeof value === 'string' &&
            value.trim()
          ) {
            resolve(value.trim());
          } else {
            reject(new Error('地址解析失败，请重试'));
          }
        },
        fail: () => {
          clearTimeout(timer);
          reject(new Error('地址获取失败，请检查网络'));
        },
      });
    } catch {
      clearTimeout(timer);
      reject(new Error('无法调用地址服务，请稍后重试'));
    }
  });
  return { ...location, address };
}
