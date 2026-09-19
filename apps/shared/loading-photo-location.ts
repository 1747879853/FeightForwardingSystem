export interface LoadingPhotoLocation {
  /** 腾讯逆地址解析返回的完整地址。 */
  address?: string;
  latitude: number;
  longitude: number;
}

/** 小程序取 GCJ-02 以匹配腾讯地图；零经纬度是合法值，不用 truthy 判断。 */
export function formatLoadingPhotoLocation(location: LoadingPhotoLocation) {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude) > 90 ||
    Math.abs(location.longitude) > 180
  ) {
    throw new Error('未获取有效位置，请重新定位后上传');
  }
  return `纬度 ${location.latitude.toFixed(6)}，经度 ${location.longitude.toFixed(6)}`;
}
