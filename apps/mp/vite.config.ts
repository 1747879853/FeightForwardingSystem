import { fileURLToPath, URL } from 'node:url';

import uniPlugin from '@dcloudio/vite-plugin-uni';
import { defineConfig } from 'vite';

// vite-plugin-uni 是 CJS 包，本包是 ESM，需要手动取 default
const uni =
  (uniPlugin as unknown as { default?: typeof uniPlugin }).default ?? uniPlugin;

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
