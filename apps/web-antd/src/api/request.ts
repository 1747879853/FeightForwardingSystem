/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'success',
      dataField: 'result',
      successCode: (code) => code === true,
    }),
  );

  // token过期的处理 - ABP框架支持
  client.addResponseInterceptor({
    rejected: async (error) => {
      const { config, response } = error;
      const responseData = response?.data;

      // ABP框架会在响应中标识未授权请求
      const isUnauthorized =
        response?.status === 401 || responseData?.unAuthorizedRequest === true;

      if (!isUnauthorized) {
        throw error;
      }

      // 判断是否启用了 refreshToken 功能
      if (!preferences.app.enableRefreshToken || config.__isRetryRequest) {
        await doReAuthenticate();
        throw error;
      }

      // 如果正在刷新 token，则将请求加入队列
      if (client.isRefreshing) {
        return new Promise((resolve) => {
          client.refreshTokenQueue.push((newToken: string) => {
            config.headers.Authorization = formatToken(newToken);
            resolve(client.request(config.url, { ...config }));
          });
        });
      }

      // 标记开始刷新 token
      client.isRefreshing = true;
      config.__isRetryRequest = true;

      try {
        const newToken = await doRefreshToken();

        // 处理队列中的请求
        client.refreshTokenQueue.forEach((callback) => callback(newToken));
        client.refreshTokenQueue = [];

        return client.request(error.config.url, { ...error.config });
      } catch (refreshError) {
        client.refreshTokenQueue.forEach((callback) => callback(''));
        client.refreshTokenQueue = [];
        console.error('Refresh token failed, please login again.');
        await doReAuthenticate();
        throw refreshError;
      } finally {
        client.isRefreshing = false;
      }
    },
  });

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // ABP格式的错误处理
      const responseData = error?.response?.data ?? {};

      // ABP框架的错误信息在 error.message 或 error.details 中
      let errorMessage = '';
      if (responseData?.error) {
        const abpError = responseData.error;
        errorMessage = abpError.message || abpError.details || '';

        // 如果有验证错误，可以特殊处理
        if (abpError.validationErrors && abpError.validationErrors.length > 0) {
          const validationMessages = abpError.validationErrors
            .map((ve: any) => ve.message)
            .join(', ');
          errorMessage = validationMessages || errorMessage;
        }
      }

      // 如果没有错误信息，则会根据状态码进行提示
      message.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
