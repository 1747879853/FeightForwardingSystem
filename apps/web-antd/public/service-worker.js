const CACHE_PREFIX = 'oss-static-resources';
const CACHE_VERSION = 'v1';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

// 自定义 CDN 域名可在这里补充
const OSS_HOST_KEYWORDS = ['aliyuncs.com', 'your-cdn.com'];

function isOssResourceRequest(requestUrl) {
  try {
    const url = new URL(requestUrl);
    return OSS_HOST_KEYWORDS.some((keyword) => url.hostname.includes(keyword));
  } catch {
    return false;
  }
}

function buildCleanCacheKey(requestUrl) {
  const url = new URL(requestUrl);
  return `${url.origin}${url.pathname}`;
}

self.addEventListener('install', (event) => {
  // 新版本 service worker 立即激活，减少旧缓存策略滞后时间
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 仅缓存 GET 资源请求，避免影响业务接口
  if (request.method !== 'GET') {
    return;
  }

  if (!isOssResourceRequest(request.url)) {
    return;
  }

  // 视频 Range 分片请求不参与该缓存策略，避免缓存部分响应导致播放异常
  if (request.headers.has('range')) {
    return;
  }

  const cleanUrl = buildCleanCacheKey(request.url);

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(cleanUrl);
      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(request);
      if (
        networkResponse &&
        (networkResponse.status === 200 || networkResponse.type === 'opaque')
      ) {
        await cache.put(cleanUrl, networkResponse.clone());
      }
      return networkResponse;
    })(),
  );
});
