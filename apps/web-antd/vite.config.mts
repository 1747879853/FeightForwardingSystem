import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
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
