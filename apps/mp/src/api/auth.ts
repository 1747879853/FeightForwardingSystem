import { request } from './request';

/** 微信登录与账密登录共用的返回体 */
export interface AuthenticateResult {
  accessToken: null | string;
  avatar?: null | string;
  encryptedAccessToken?: null | string;
  expireInSeconds?: number;
  nickName?: null | string;
  refreshToken?: null | string;
  /** true 表示 openid 还没绑账号，需要走手机号登录 */
  shouldBindingUser?: boolean;
  userId?: number | string;
  weappOpenId?: null | string;
  weChatUnionId?: null | string;
}

/**
 * 微信静默登录：启动时先调，不花钱。
 * shouldBindingUser 为 true 时才允许继续走手机号登录。
 */
export function wxSilentAuthenticate(code: string) {
  return request<AuthenticateResult>({
    url: '/TokenAuth/WxOpenSilentAuthenticate',
    method: 'POST',
    data: { code },
  });
}

/**
 * 微信手机号登录：每次成功扣费，只能在静默登录返回 shouldBindingUser 后调用。
 * @param code 手机号快速验证组件回调里的 e.detail.code
 * @param loginCode wx.login 的 code，传了才能绑定 openid 供后续静默登录
 */
export function wxPhoneAuthenticate(code: string, loginCode?: string) {
  return request<AuthenticateResult>({
    url: '/TokenAuth/WxOpenPhoneAuthenticate',
    method: 'POST',
    data: { code, loginCode },
  });
}

/** 开发态账密登录，租户固定 1，与微信登录口径一致 */
export function passwordAuthenticate(
  userNameOrEmailAddress: string,
  password: string,
) {
  return request<AuthenticateResult>({
    url: '/TokenAuth/AuthenticateTenantLogin',
    method: 'POST',
    data: { userNameOrEmailAddress, password, tenantId: 1 },
  });
}

/** 调用 wx.login 拿一次性 code */
export function getWxLoginCode() {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('微信登录凭证获取失败，请重新进入小程序'));
        }
      },
      fail: () => reject(new Error('微信登录凭证获取失败，请重新进入小程序')),
    });
  });
}
