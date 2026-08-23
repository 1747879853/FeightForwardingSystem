import { reactive } from 'vue';

import type { AuthenticateResult } from '@/api/auth';
import type { MyProfile } from '@/api/user';

import {
  getWxLoginCode,
  passwordAuthenticate,
  wxPhoneAuthenticate,
  wxSilentAuthenticate,
} from '@/api/auth';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/api/request';
import { getMyProfile, logout as logoutApi } from '@/api/user';

interface AuthState {
  /** 静默登录发现 openid 未绑账号，需要用户点手机号授权 */
  needPhoneBinding: boolean;
  profile: MyProfile | null;
  /** 首次会话恢复是否已结束，页面据此决定是否显示骨架 */
  ready: boolean;
  token: string;
}

export const authState = reactive<AuthState>({
  needPhoneBinding: false,
  profile: null,
  ready: false,
  token: getAccessToken(),
});

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
  } catch {
    // 拉个人信息失败不影响业务页，个人中心会显示占位
    authState.profile = null;
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
  return ok;
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
  return ok;
}

/** 开发态账密登录，不作为师傅正式入口 */
export async function loginByPassword(userName: string, password: string) {
  const result = await passwordAuthenticate(userName, password);
  const ok = applyAuthResult(result);
  if (ok) await loadProfile();
  return ok;
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
