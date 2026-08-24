import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';

import { defineConfig } from '@vben/vite-config';

const appRoot = dirname(fileURLToPath(import.meta.url));

const BRAND_IMG_BY_APP_BRAND: Record<string, string> = {
  hhyy: 'hhyy',
  jht: 'jht',
  jiayue: 'jiayue',
  longshan: 'longshan',
  sjtd: 'sjtd',
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

/** 侧栏/偏好 Logo：同步到 public 稳定文件名，避免 preferences 缓存 vite hash 路径跨包 404 */
function resolveSidebarLogoSrc(brandImgDir: string) {
  const candidates = [
    { file: 'logo.png', dest: 'logo.png' },
    { file: 'logo.webp', dest: 'logo.webp' },
  ] as const;
  for (const { file, dest } of candidates) {
    const filePath = join(brandImgDir, file);
    if (existsSync(filePath)) {
      return { filePath, dest };
    }
  }
  return null;
}

function resolveApiTarget(mode: string) {
  const brand = resolveAppBrand(mode);
  if (brand === 'jht') {
    return 'https://api.jinhaitone.com';
  }
  if (brand === 'sjtd') {
    return 'http://43.138.14.122:84';
  }
  if (brand === 'longshan') {
    return 'http://175.178.101.30:86';
  }
  return 'http://118.190.1.4:82';
}

function resolveCliArg(name: string) {
  const prefix = `--${name}=`;
  const args = process.argv;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === `--${name}` && args[i + 1]) {
      return args[i + 1];
    }
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return '';
}

function prepareIsolatedPublicDir(mode: string) {
  const isolatedPublicDir = join(appRoot, '.brand-public', mode);
  rmSync(isolatedPublicDir, { recursive: true, force: true });
  mkdirSync(isolatedPublicDir, { recursive: true });
  const sharedPublicDir = join(appRoot, 'public');
  if (existsSync(sharedPublicDir)) {
    cpSync(sharedPublicDir, isolatedPublicDir, { recursive: true });
  }
  return isolatedPublicDir;
}

function createSyncLoadingLogoPlugin(mode: string, publicRoot: string) {
  const appBrand = resolveAppBrand(mode);
  const brandImgDir = resolveBrandImgDir(mode);
  const { filePath: loadingLogoSrc, mime: loadingLogoMime } =
    resolveLoadingLogoSrc(brandImgDir);
  const loadingLogoDest = join(publicRoot, 'logo-text.png');
  const loadingLogoDataUri = `data:${loadingLogoMime};base64,${readFileSync(loadingLogoSrc).toString('base64')}`;

  /** 首屏 loading：同步 public 副本，并将 HTML 内 logo 内联为 data URI，避免首帧请求未完成 */
  return {
    name: 'sync-loading-logo',
    buildStart() {
      copyFileSync(loadingLogoSrc, loadingLogoDest);
      const brandFavicon = resolveFaviconSrc(brandImgDir);
      if (brandFavicon) {
        copyFileSync(brandFavicon, join(publicRoot, 'favicon.png'));
      }
      const sidebarLogo = resolveSidebarLogoSrc(brandImgDir);
      if (sidebarLogo) {
        copyFileSync(sidebarLogo.filePath, join(publicRoot, sidebarLogo.dest));
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
  // Local publish sets WEB_ANTD_OUT_DIR=dist-<brand> so parallel builds do not
  // share apps/web-antd/dist or mutate the shared public/ folder. GitHub
  // hhyy/jht workflows omit the env and keep writing to dist + public/.
  const isolatedOutDir =
    process.env.WEB_ANTD_OUT_DIR?.trim() || resolveCliArg('outDir');
  const isolatedCacheDir =
    process.env.WEB_ANTD_CACHE_DIR?.trim() || resolveCliArg('cacheDir');
  const publicRoot = isolatedOutDir
    ? prepareIsolatedPublicDir(mode)
    : join(appRoot, 'public');

  return {
    application: {},
    vite: {
      publicDir: publicRoot,
      ...(isolatedCacheDir ? { cacheDir: isolatedCacheDir } : {}),
      ...(isolatedOutDir ? { build: { outDir: isolatedOutDir } } : {}),
      plugins: [createSyncLoadingLogoPlugin(mode, publicRoot)],
      // build: {
      //   minify: 'terser', // 明确指定使用 terser
      //   terserOptions: {
      //     compress: {
      //       // 生产环境移除 console
      //       drop_console: true,
      //       // 可选：同时移除 debugger 语句
      //       drop_debugger: true,
      //       // 更精细的控制：只移除特定的 console 方法
      //       pure_funcs: ['console.log', 'console.info', 'console.debug'],
      //     },
      //   },
      // },
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: `${apiTarget}/api`,
            ws: true,
          },
          '/PrintTempFile': {
            changeOrigin: true,
            target: apiTarget,
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
