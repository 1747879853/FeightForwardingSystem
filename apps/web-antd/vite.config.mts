import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@vben/vite-config';

const appRoot = dirname(fileURLToPath(import.meta.url));
const loadingLogoSrc = join(appRoot, 'src/assets/img/logo-text.png');
const loadingLogoDest = join(appRoot, 'public/logo-text.png');
const loadingLogoDataUri = `data:image/png;base64,${readFileSync(loadingLogoSrc).toString('base64')}`;

/** 首屏 loading：同步 public 副本，并将 HTML 内 logo 内联为 data URI，避免首帧请求未完成 */
function syncLoadingLogoPlugin() {
  return {
    name: 'sync-loading-logo',
    buildStart() {
      copyFileSync(loadingLogoSrc, loadingLogoDest);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replaceAll('src="/logo-text.png"', `src="${loadingLogoDataUri}"`);
      },
    },
  };
}

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [syncLoadingLogoPlugin()],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://118.190.1.4:82/api',
            ws: true,
          },
          // UserConfiguration 接口不需要 /api 前缀
          '/UserConfiguration': {
            changeOrigin: true,
            target: 'http://118.190.1.4:82',
            ws: true,
          },
          '/upload': {
            changeOrigin: true,
            target: 'http://118.190.1.4:82',
            ws: true,
          },
          '/Uploads': {
            changeOrigin: true,
            target: 'http://118.190.1.4:82',
            ws: true,
          },
        },
      },
    },
  };
});
