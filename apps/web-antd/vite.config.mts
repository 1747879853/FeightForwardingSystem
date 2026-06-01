import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';

import { defineConfig } from '@vben/vite-config';

const appRoot = dirname(fileURLToPath(import.meta.url));

const BRAND_IMG_BY_APP_BRAND: Record<string, string> = {
  hhyy: 'hhyy',
  jht: 'jht',
  jiayue: 'jiayue',
};

function loadAppEnv(mode: string) {
  return loadEnv(mode, appRoot, '');
}

function resolveAppBrand(mode: string) {
  const env = loadAppEnv(mode);
  if (env.VITE_APP_BRAND) {
    return env.VITE_APP_BRAND;
  }
  return mode === 'development' ? 'jiayue' : '';
}

function resolveBrandImgDir(mode: string) {
  const brand = resolveAppBrand(mode);
  const subdir = BRAND_IMG_BY_APP_BRAND[brand] ?? '';
  return join(appRoot, 'src/assets/img', subdir);
}

function resolveLoadingLogoSrc(brandImgDir: string) {
  const candidates = ['logo-text.png', 'logo-text.webp', 'logo.webp'];
  for (const file of candidates) {
    const filePath = join(brandImgDir, file);
    if (existsSync(filePath)) {
      const mime = file.endsWith('.webp') ? 'image/webp' : 'image/png';
      return { filePath, mime };
    }
  }
  throw new Error(
    `[sync-loading-logo] 未找到 Loading Logo：${brandImgDir}（需要 logo-text.png/webp 等）`,
  );
}

function resolveFaviconSrc(brandImgDir: string) {
  const candidates = ['favicon.png', 'logo.png'];
  for (const file of candidates) {
    const filePath = join(brandImgDir, file);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function resolveApiTarget(mode: string) {
  if (resolveAppBrand(mode) === 'jht') {
    return 'http://43.138.14.122:82';
  }
  return 'http://118.190.1.4:82';
}

function createSyncLoadingLogoPlugin(mode: string) {
  const appBrand = resolveAppBrand(mode);
  const brandImgDir = resolveBrandImgDir(mode);
  const { filePath: loadingLogoSrc, mime: loadingLogoMime } =
    resolveLoadingLogoSrc(brandImgDir);
  const loadingLogoDest = join(appRoot, 'public/logo-text.png');
  const loadingLogoDataUri = `data:${loadingLogoMime};base64,${readFileSync(loadingLogoSrc).toString('base64')}`;

  /** 首屏 loading：同步 public 副本，并将 HTML 内 logo 内联为 data URI，避免首帧请求未完成 */
  return {
    name: 'sync-loading-logo',
    buildStart() {
      copyFileSync(loadingLogoSrc, loadingLogoDest);
      const brandFavicon = resolveFaviconSrc(brandImgDir);
      if (brandFavicon) {
        copyFileSync(brandFavicon, join(appRoot, 'public/favicon.png'));
      }
    },
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        const brandLoadingClass =
          appBrand === 'jht' ? ' loader-fill--brand-jht' : '';
        return html
          .replaceAll('{{BRAND_LOADING_CLASS}}', brandLoadingClass)
          .replaceAll(
            'src="/logo-text.png"',
            `src="${loadingLogoDataUri}"`,
          );
      },
    },
  };
}

export default defineConfig(async (config) => {
  const mode = config?.mode ?? 'development';
  const apiTarget = resolveApiTarget(mode);

  return {
    application: {},
    vite: {
      plugins: [createSyncLoadingLogoPlugin(mode)],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: `${apiTarget}/api`,
            ws: true,
          },
          '/UserConfiguration': {
            changeOrigin: true,
            target: apiTarget,
            ws: true,
          },
          '/upload': {
            changeOrigin: true,
            target: apiTarget,
            ws: true,
          },
          '/Uploads': {
            changeOrigin: true,
            target: apiTarget,
            ws: true,
          },
        },
      },
    },
  };
});
