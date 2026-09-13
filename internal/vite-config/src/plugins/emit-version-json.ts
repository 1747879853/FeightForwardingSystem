import type { PluginOption } from 'vite';

import { execSync } from 'node:child_process';

import { colors, generatorContentHash } from '@vben/node-utils';

const VERSION_FILE_NAME = 'version.json';

type VersionJsonPayload = {
  /** 入口 JS 路径，检查更新在 id 缺失时回退 */
  entry: string;
  /** 本次 js/css 文件名指纹，检查更新只比这个 */
  id: string;
  /** 构建时 HEAD 的 40 位 SHA；无 git 时省略 */
  commit?: string;
  /** 构建完成时刻（UTC ISO） */
  builtAt: string;
  /** 工作区有未提交改动时才写出 */
  dirty?: true;
};

function readGitBuildMeta(): { commit: string; dirty: boolean } {
  try {
    const commit = execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
    if (!/^[0-9a-f]{40}$/i.test(commit)) {
      return { commit: '', dirty: false };
    }
    const porcelain = execSync('git status --porcelain', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    return { commit, dirty: porcelain.trim().length > 0 };
  } catch {
    return { commit: '', dirty: false };
  }
}

/**
 * 构建时写出 version.json：检查更新比对 id/entry；commit/builtAt 给发布记录对齐 git。
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
      const { commit, dirty } = readGitBuildMeta();
      const payload: VersionJsonPayload = {
        entry,
        id: generatorContentHash(fileNames.join('|'), 8),
        builtAt: new Date().toISOString(),
      };
      if (commit) {
        payload.commit = commit;
      }
      if (dirty) {
        payload.dirty = true;
      }

      this.emitFile({
        fileName: VERSION_FILE_NAME,
        source: JSON.stringify(payload),
        type: 'asset',
      });

      const commitHint = commit
        ? ` commit ${commit.slice(0, 8)}${dirty ? ' dirty' : ''}`
        : '';
      console.log(
        colors.cyan(
          `✨ ${VERSION_FILE_NAME} is build successfully!${commitHint}`,
        ),
      );
    },
    name: 'vite:emit-version-json',
  };
}

export { viteEmitVersionJsonPlugin };
