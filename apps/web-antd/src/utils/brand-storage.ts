/**
 * 与 main.ts 中 initPreferences / initStores 使用同一套命名空间，
 * 保证 Pinia、偏好设置与其它 localStorage 缓存在不同公司品牌间隔离。
 */
export function getAppStorageNamespace() {
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  return `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;
}

/** 业务自定义 localStorage / sessionStorage 键名（已含品牌前缀） */
export function buildBrandStorageKey(key: string) {
  return `${getAppStorageNamespace()}__${key}`;
}

/** 登录页「记住账号」缓存键（按品牌 + 域名隔离） */
export function getBrandRememberMeStorageKey() {
  return buildBrandStorageKey(`remember_me_username_${location.hostname}`);
}
