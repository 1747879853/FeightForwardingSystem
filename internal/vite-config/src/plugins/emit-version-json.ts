import type { PluginOption } from 'vite';

import { colors, generatorContentHash } from '@vben/node-utils';

const VERSION_FILE_NAME = 'version.json';

/**
 * 构建时写出 version.json，供运行时检查更新比对入口与资源指纹。
 */
function viteEmitVersionJsonPlugin(): PluginOption {
  return {
    apply: 'build',
    generateBundle(_, bundle) {
      const fileNames = Object.values(bundle)
        .map((item) => item.fileName)
        .filter((name) => /\.(css|js)$/.test(name))
        .sort();

      const entries = Object.values(bundle)
        .filter((item) => item.type === 'chunk' && item.isEntry)
        .map((item) => item.fileName)
        .sort();

      const entry = entries[0] ? `/${entries[0]}` : '';
      const source = JSON.stringify({
        entry,
        id: generatorContentHash(fileNames.join('|'), 8),
      });

      this.emitFile({
        fileName: VERSION_FILE_NAME,
        source,
        type: 'asset',
      });

      console.log(
        colors.cyan(`✨ ${VERSION_FILE_NAME} is build successfully!`),
      );
    },
    name: 'vite:emit-version-json',
  };
}

export { viteEmitVersionJsonPlugin };
