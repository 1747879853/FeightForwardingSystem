import type { MenuRecordRaw } from '@vben/types';
import type { Router } from 'vue-router';

/** 路由已注册且不是 404 / 根布局本身 */
export function isAccessiblePage(
  router: Pick<Router, 'resolve'>,
  path: string,
) {
  if (!path) return false;
  return router.resolve(path).matched.some((record) => {
    return record.name !== 'FallbackNotFound' && record.name !== 'Root';
  });
}

function visibleMenuPaths(menus: MenuRecordRaw[]): string[] {
  const paths: string[] = [];
  for (const menu of menus) {
    if (menu.show === false) continue;
    if (menu.children?.length) {
      paths.push(...visibleMenuPaths(menu.children));
    } else if (menu.path) {
      paths.push(menu.path);
    }
  }
  return paths;
}

/**
 * 优先打开指定首页。首页没有权限或已下线时，改去第一个可见菜单。
 */
export function resolveLandingPath(
  router: Pick<Router, 'resolve'>,
  preferred: string,
  menus: MenuRecordRaw[],
) {
  if (isAccessiblePage(router, preferred)) return preferred;
  for (const path of visibleMenuPaths(menus)) {
    if (isAccessiblePage(router, path)) return path;
  }
  return preferred;
}
