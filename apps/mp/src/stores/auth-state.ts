import { reactive } from 'vue';

import type { MyProfile } from '@/api/user';

export const TOKEN_KEY = 'mp_access_token';

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
  token: uni.getStorageSync(TOKEN_KEY) || '',
});
