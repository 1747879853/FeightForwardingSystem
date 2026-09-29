import type { MenuRecordRaw } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { resolveLandingPath } from './landing-path';

function routerWith(paths: string[]) {
  return {
    resolve(path: string) {
      if (paths.includes(path)) {
        return { matched: [{ name: 'Page' }] };
      }
      return { matched: [{ name: 'FallbackNotFound' }] };
    },
  };
}

const menus = [
  { name: '工作台', path: '/workspace', show: true },
  {
    name: '操作管理',
    path: '/operation-management',
    show: true,
    children: [{ name: '海运出口', path: '/sea-exports', show: true }],
  },
] as MenuRecordRaw[];

describe('登录落地页', () => {
  it('有工作台权限时进入工作台', () => {
    expect(
      resolveLandingPath(routerWith(['/workspace']), '/workspace', menus),
    ).toBe('/workspace');
  });

  it('没有工作台权限时进入第一个可见菜单', () => {
    expect(
      resolveLandingPath(routerWith(['/sea-exports']), '/workspace', menus),
    ).toBe('/sea-exports');
  });

  it('跳过隐藏菜单', () => {
    const hiddenFirst = [
      { name: '拓客管理', path: '/analytics', show: false },
      { name: '提单管理', path: '/bill-of-lading', show: true },
    ] as MenuRecordRaw[];
    expect(
      resolveLandingPath(
        routerWith(['/bill-of-lading']),
        '/workspace',
        hiddenFirst,
      ),
    ).toBe('/bill-of-lading');
  });
});
