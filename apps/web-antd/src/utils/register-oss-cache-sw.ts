export function registerOssCacheServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    // 当前阶段禁用 SW：主动注销已安装的 registration，避免继续拦截 OSS 请求
    void navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
      })
      .catch(() => {
        // 注销失败不影响主流程
      });

    // 同步清理历史 OSS 缓存，避免命中旧缓存导致行为不一致
    if ('caches' in window) {
      void caches
        .keys()
        .then(async (keys) => {
          const ossCacheKeys = keys.filter((key) =>
            key.startsWith('oss-static-resources'),
          );
          await Promise.all(ossCacheKeys.map((key) => caches.delete(key)));
        })
        .catch(() => {
          // 缓存清理失败不影响主流程
        });
    }
  });
}
