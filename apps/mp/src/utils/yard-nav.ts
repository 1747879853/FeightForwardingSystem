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

interface QqMapGeocoderResponse {
  status: number;
  message: string;
  result?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
}

const geoCache = new Map<string, GeoPoint>();

/** 编译期注入；改 .env 后须重启 uni/vite */
const QQMAP_KEY = String(import.meta.env.VITE_QQMAP_KEY ?? '').trim();

function getQqMapKey() {
  return QQMAP_KEY;
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

  const key = getQqMapKey();
  if (!key) {
    throw new Error(
      '未配置腾讯地图 Key，请检查 apps/mp/.env 的 VITE_QQMAP_KEY 并重启编译',
    );
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      method: 'GET',
      data: {
        address,
        key,
      },
      success: (res) => {
        const data = (res.data ?? {}) as QqMapGeocoderResponse;
        const lat = data.result?.location?.lat;
        const lng = data.result?.location?.lng;
        if (data.status === 0 && lat != null && lng != null) {
          const point = { latitude: lat, longitude: lng };
          geoCache.set(address, point);
          resolve(point);
          return;
        }
        reject(
          new Error(
            data.message ||
              `地址解析失败(status=${String(data.status ?? res.statusCode)})`,
          ),
        );
      },
      fail: (err) => {
        reject(
          new Error(
            err?.errMsg || '地址解析请求失败，请确认合法域名含 apis.map.qq.com',
          ),
        );
      },
    });
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
 * Key 只给腾讯 WebService，不传给微信导航；不依赖 qqmap CJS SDK（避免 Vite 导出问题）。
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
