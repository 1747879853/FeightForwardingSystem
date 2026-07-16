import { initPreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { getAppStorageNamespace } from '#/utils/brand-storage';
import { registerOssCacheServiceWorker } from '#/utils/register-oss-cache-sw';

import { overridesPreferences } from './preferences';

// 完整版(含 filters / dropdown / comment 等)
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';

import { registerAllModules } from 'handsontable/registry';
registerAllModules();

// numeric 单元格类型在 Handsontable 中已经内置,无需手动注册

const MIN_APP_LOADING_MS = 800;

async function ensureMinAppLoadingVisible() {
  const startedAt =
    (window as Window & { __APP_LOADING_START__?: number })
      .__APP_LOADING_START__ ?? performance.now();
  const elapsed = performance.now() - startedAt;
  if (elapsed < MIN_APP_LOADING_MS) {
    await new Promise((resolve) => {
      setTimeout(resolve, MIN_APP_LOADING_MS - elapsed);
    });
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  // name用于指定项目唯一标识
  // 用于区分不同项目的偏好设置以及存储数据的key前缀以及其他一些需要隔离的数据
  const namespace = getAppStorageNamespace();

  // app偏好设置初始化
  await initPreferences({
    namespace,
    overrides: overridesPreferences,
  });

  // 启动应用并挂载
  // vue应用主要逻辑及视图
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  await ensureMinAppLoadingVisible();

  // 移除并销毁loading
  unmountGlobalLoading();
}

registerOssCacheServiceWorker();
initApplication();
