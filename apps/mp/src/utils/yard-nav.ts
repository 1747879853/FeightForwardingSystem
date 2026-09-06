import type { QqMapGeocoderResult } from '@/libs/qqmap-wx-jssdk.min.js';

import QQMapWX from '@/libs/qqmap-wx-jssdk.min.js';

export interface YardNavTarget {
  /** 堆场名称，openLocation 的 name */
  name?: null | string;
  /** 完整中文地址，优先用于地理编码 */
  address?: null | string;
}

interface GeoPoint {
  latitude: number;
  longitude: number;
}

const geoCache = new Map<string, GeoPoint>();

let qqmapSdk: null | QQMapWX = null;

function getQqMapKey() {
  return String(import.meta.env.VITE_QQMAP_KEY ?? '').trim();
}

function getSdk() {
  const key = getQqMapKey();
  if (!key) {
    throw new Error('未配置腾讯地图 Key（VITE_QQMAP_KEY）');
  }
  if (!qqmapSdk) {
    qqmapSdk = new QQMapWX({ key });
  }
  return qqmapSdk;
}

function resolveGeocodeQuery(yard: YardNavTarget): {
  query: string;
  warnIncomplete: boolean;
} | null {
  const address = yard.address?.trim() ?? '';
  const name = yard.name?.trim() ?? '';
  if (address) {
    return { query: address, warnIncomplete: false };
  }
  if (name) {
    return { query: name, warnIncomplete: true };
  }
  return null;
}

function geocodeAddress(address: string): Promise<GeoPoint> {
  const cached = geoCache.get(address);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settleOk = (point: GeoPoint) => {
      if (settled) return;
      settled = true;
      geoCache.set(address, point);
      resolve(point);
    };
    const settleFail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };

    try {
      getSdk().geocoder({
        address,
        success(res: QqMapGeocoderResult) {
          const lat = res.result?.location?.lat;
          const lng = res.result?.location?.lng;
          if (res.status === 0 && lat != null && lng != null) {
            settleOk({ latitude: lat, longitude: lng });
            return;
          }
          settleFail(res.message || '地址解析失败');
        },
        fail(err) {
          settleFail(err?.message || '地址解析失败');
        },
      });
    } catch (error) {
      settleFail(error instanceof Error ? error.message : '地址解析失败');
    }
  });
}

function openMap(point: GeoPoint, yard: YardNavTarget, displayAddress: string) {
  return new Promise<void>((resolve, reject) => {
    uni.openLocation({
      latitude: point.latitude,
      longitude: point.longitude,
      name: yard.name?.trim() || '监装堆场',
      address: displayAddress || yard.name?.trim() || '',
      scale: 16,
      success: () => resolve(),
      fail: (err) => {
        reject(
          new Error(
            (err as { errMsg?: string })?.errMsg ||
              '打开地图失败，请检查隐私与权限配置',
          ),
        );
      },
    });
  });
}

/**
 * 用腾讯地理编码把堆场中文地址转成经纬度，再调微信 openLocation。
 * Key 只给腾讯 SDK，不传给微信导航。
 */
export async function openYardNavigation(
  yard: YardNavTarget | null | undefined,
) {
  if (!yard) {
    throw new Error('未选择监装堆场');
  }

  const resolved = resolveGeocodeQuery(yard);
  if (!resolved) {
    throw new Error('未维护堆场地址');
  }

  const warnIncomplete = resolved.warnIncomplete;

  uni.showLoading({ title: '定位中', mask: true });
  try {
    const point = await geocodeAddress(resolved.query);
    await openMap(point, yard, yard.address?.trim() || resolved.query);
    if (warnIncomplete) {
      // openLocation 成功后再提示，避免被 showLoading 盖掉
      setTimeout(() => {
        uni.showToast({
          icon: 'none',
          title: '请在船公司资料补全堆场地址',
          duration: 2500,
        });
      }, 400);
    }
  } finally {
    uni.hideLoading();
  }
}
