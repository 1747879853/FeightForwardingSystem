export function registerOssCacheServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const serviceWorkerUrl = `${normalizedBaseUrl}service-worker.js`;

    navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {
      // 注册失败不影响主流程
    });
  });
}
