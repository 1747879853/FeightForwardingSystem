import type { Recordable, UserInfo } from '@vben/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import { clearAllBizSelectCaches } from '#/adapter/component/biz-select/cache/create-biz-select-cache';
import { getAccessCodesApi, getUserInfoApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';
import { useTableConfigStore } from '#/store/table-config';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const tableConfigStore = useTableConfigStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  async function getAppRouter() {
    if (router) {
      return router;
    }
    const { router: appRouter } = await import('#/router');
    return appRouter;
  }

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const response = await loginApi({
        userNameOrEmailAddress: params.username,
        password: params.password,
        tenantId: 1,
        tenancyName: 'default',
      });

      const {
        accessToken,
        refreshToken: _refreshToken,
        userId: _userId,
        requiresTwoFactorVerification,
        shouldResetPassword,
      } = response;

      // 检查是否需要双因素认证
      if (requiresTwoFactorVerification) {
        notification.warning({
          description: $t('authentication.twoFactorRequired'),
          duration: 3,
          message: $t('authentication.loginWarning'),
        });
        return { userInfo };
      }

      // 检查是否需要重置密码
      if (shouldResetPassword) {
        notification.warning({
          description: $t('authentication.passwordResetRequired'),
          duration: 3,
          message: $t('authentication.loginWarning'),
        });
        return { userInfo };
      }

      // 存储访问令牌
      accessStore.setAccessToken(accessToken);

      // 新会话开始：复位权限初始化标记，确保登录后的首页导航一定会在路由守卫中
      // 重新生成菜单。否则若上一次会话遗留（或失效前未完成的初始化流程迟到写入）
      // 把 isAccessChecked 置为 true，守卫会直接放行而跳过菜单重建，导致菜单只剩概览。
      accessStore.setIsAccessChecked(false);

      // 可以在这里存储 refreshToken 和 userId（如果需要）
      // accessStore.setRefreshToken(refreshToken);
      // userStore.setUserId(userId);

      // 获取用户信息并存储到 accessStore 中
      const [fetchUserInfoResult, accessCodes] = await Promise.all([
        fetchUserInfo(),
        getAccessCodesApi(),
      ]);

      userInfo = fetchUserInfoResult;

      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(accessCodes);
      tableConfigStore.$reset();
      try {
        await Promise.all([
          tableConfigStore.loadTableConfigsOnce(),
          tableConfigStore.loadSearchFormConfigsOnce(),
          tableConfigStore.loadGroupConfigsOnce(),
        ]);
      } catch {
        // 不阻塞登录主流程，表格配置在实际使用时可继续回退到本地/远端兜底
      }

      if (accessStore.loginExpired) {
        accessStore.setLoginExpired(false);
      } else {
        const appRouter = await getAppRouter();
        onSuccess
          ? await onSuccess?.()
          : await appRouter.push(
              userInfo.homePath || preferences.app.defaultHomePath,
            );
      }

      if (userInfo?.realName) {
        notification.success({
          description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
          duration: 3,
          message: $t('authentication.loginSuccess'),
        });
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(_redirect: boolean = true) {
    const appRouter = await getAppRouter();
    let isLogoutTokenExpired = false;
    try {
      await logoutApi();
    } catch (error: any) {
      if (error?.response?.status === 401) {
        isLogoutTokenExpired = true;
      }
    }
    // 须在 resetAllStores 前清理，以便按当前用户 scope 删掉 localStorage
    clearAllBizSelectCaches();
    resetAllStores();
    tableConfigStore.$reset();
    accessStore.setLoginExpired(false);

    if (isLogoutTokenExpired) {
      await appRouter.replace(preferences.app.defaultHomePath);
      return;
    }

    // 统一回登录页，不再携带历史地址（登录后固定回首页）
    await appRouter.replace({
      path: LOGIN_PATH,
    });
  }

  async function fetchUserInfo() {
    let userInfo: null | UserInfo = null;
    userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
