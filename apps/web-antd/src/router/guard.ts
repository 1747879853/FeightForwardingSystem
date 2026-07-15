import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { getAccessCodesApi } from '#/api';
import { setupUnsavedNavigationGuard } from '#/composables/use-unsaved-guard';
import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

async function ensureAccessInitialized(params: {
  authStore: ReturnType<typeof useAuthStore>;
  accessStore: ReturnType<typeof useAccessStore>;
  router: Router;
  userStore: ReturnType<typeof useUserStore>;
}) {
  const { accessStore, authStore, router, userStore } = params;

  if (accessStore.isAccessChecked) {
    return userStore.userInfo;
  }

  // 以当前 accessToken 作为「会话纪元」：登录会写入新 token、登出会清空 token。
  // 失效前未完成的初始化流程（stale）持有的是旧 token；其在 await 之后若发现
  // token 已变化，说明会话已切换（已登出 / 已重新登录），必须放弃写入，避免用
  // 旧会话拉到的空权限覆盖菜单并把 isAccessChecked 锁死，导致登录后菜单只剩概览。
  const sessionToken = accessStore.accessToken;
  const isSameSession = () => accessStore.accessToken === sessionToken;

  const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());

  // 复用登录流程已写入的权限码：
  // 菜单是在此处由 generateAccess 依据 accessCodes 生成的。登录流程
  // （authStore.authLogin）已通过 Promise.all 拉取并写入正确的 accessCodes，
  // 直接复用可避免守卫再次自行获取时与登录写入值不同步（如 token 过期重登、
  // resetAllStores 之后的状态竞态）而导致 roles 为空、菜单只剩「概览」的问题。
  // accessCodes 不做持久化，刷新后内存为空会在此自动重新拉取。
  let accessCodes = accessStore.accessCodes;
  if (accessCodes.length === 0) {
    accessCodes = await getAccessCodesApi();
  }

  // 拉取期间会话已切换，丢弃本次（stale）结果。
  if (!isSameSession()) {
    return userInfo;
  }
  accessStore.setAccessCodes(accessCodes);

  const { accessibleMenus, accessibleRoutes } = await generateAccess({
    roles: accessCodes,
    router,
    routes: accessRoutes,
  });

  // 生成期间会话已切换，丢弃本次（stale）结果，避免覆盖新会话的菜单。
  if (!isSameSession()) {
    return userInfo;
  }

  accessStore.setAccessMenus(accessibleMenus);
  accessStore.setAccessRoutes(accessibleRoutes);

  // 兜底：若权限码仍为空，菜单只会渲染出「概览」一个菜单。此时不锁定
  // isAccessChecked，使后续任意导航能重新获取权限并重建菜单，避免本会话被锁死、
  // 必须刷新才能恢复。
  if (accessCodes.length > 0) {
    accessStore.setIsAccessChecked(true);
  }

  return userInfo;
}

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        // 登录后固定回首页，忽略历史地址（redirect）
        return userStore.userInfo?.homePath || preferences.app.defaultHomePath;
      }

      // 刷新进入 /profile 等核心页时，也需要初始化用户信息和菜单权限
      if (to.path !== LOGIN_PATH && accessStore.accessToken) {
        await ensureAccessInitialized({
          accessStore,
          authStore,
          router,
          userStore,
        });
      }
      return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面（登录后固定回首页，不携带历史地址）
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          replace: true,
        };
      }
      return to;
    }

    if (accessStore.isAccessChecked) {
      return true;
    }

    const userInfo = await ensureAccessInitialized({
      accessStore,
      authStore,
      router,
      userStore,
    });
    // 登录后固定回首页，忽略历史地址（redirect）；
    // 但刷新非首页时（to 即当前页）仍停留当前页，避免刷新被弹回首页。
    const redirectPath = (
      to.path === preferences.app.defaultHomePath
        ? userInfo?.homePath || preferences.app.defaultHomePath
        : to.fullPath
    ) as string;

    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 未保存内容拦截：需最先注册，用户取消离开时可尽早中断后续守卫 */
  setupUnsavedNavigationGuard(router);
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
