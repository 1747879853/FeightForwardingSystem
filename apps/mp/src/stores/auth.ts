import type { AuthenticateResult } from '@/api/auth';
import {
  getWxLoginCode,
  passwordAuthenticate,
  wxPhoneAuthenticate,
  wxSilentAuthenticate,
} from '@/api/auth';
import { ApiError, clearAccessToken, setAccessToken } from '@/api/request';
import { getMyProfile, logout as logoutApi } from '@/api/user';

import { authState } from './auth-state';

export { authState } from './auth-state';

export function isLoggedIn() {
  return Boolean(authState.token);
}

function applyAuthResult(result: AuthenticateResult) {
  if (!result?.accessToken) return false;
  setAccessToken(result.accessToken);
  authState.token = result.accessToken;
  authState.needPhoneBinding = false;
  return true;
}

async function loadProfile() {
  try {
    authState.profile = await getMyProfile();
  } catch (error) {
    authState.profile = null;
    // 鉴权失败不能被当作登录成功；普通资料错误仍允许进入业务页。
    if (error instanceof ApiError && error.unauthorized) throw error;
  }
}

/**
 * 微信静默登录。返回 true 表示已拿到 token，
 * false 表示 openid 还没绑账号，需要走手机号一键登录。
 */
export async function silentLogin() {
  const code = await getWxLoginCode();
  const result = await wxSilentAuthenticate(code);
  if (result?.shouldBindingUser) {
    authState.needPhoneBinding = true;
    return false;
  }
  const ok = applyAuthResult(result);
  if (ok) await loadProfile();
  return ok && isLoggedIn();
}

/**
 * 手机号一键登录。按次收费，只在 needPhoneBinding 为 true 时调用。
 * @param code getphonenumber 回调里的 e.detail.code
 */
export async function loginByPhone(code: string) {
  const loginCode = await getWxLoginCode();
  const result = await wxPhoneAuthenticate(code, loginCode);
  const ok = applyAuthResult(result);
  if (ok) await loadProfile();
  return ok && isLoggedIn();
}

/** 开发态账密登录，不作为师傅正式入口 */
export async function loginByPassword(userName: string, password: string) {
  const result = await passwordAuthenticate(userName, password);
  const ok = applyAuthResult(result);
  if (ok) await loadProfile();
  return ok && isLoggedIn();
}

export async function logout() {
  try {
    await logoutApi();
  } catch {
    // 后端登出失败也要清本地，避免卡在无效 token 上
  }
  clearAccessToken();
  authState.token = '';
  authState.profile = null;
  authState.needPhoneBinding = false;
}

/** App 启动时调用：本地有 token 就直接用，否则尝试静默登录 */
export async function restoreSession() {
  try {
    if (authState.token) {
      await loadProfile();
      return;
    }
    // #ifdef MP-WEIXIN
    await silentLogin();
    // #endif
  } catch {
    // 启动阶段静默失败不打扰用户，由登录页兜底
  } finally {
    authState.ready = true;
  }
}
