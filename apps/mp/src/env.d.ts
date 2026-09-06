/// <reference types="@dcloudio/types" />

interface ImportMetaEnv {
  /** 后端根地址，不带 /api */
  readonly VITE_API_ORIGIN: string;
  /** 'true' 时展示开发态账密登录入口 */
  readonly VITE_ENABLE_PASSWORD_LOGIN: string;
  /**
   * 腾讯位置服务微信小程序 Key（须绑本小程序 AppID，并开通地理编码 / WebService）
   * 仅用于地址转经纬度，不传给 uni.openLocation
   */
  readonly VITE_QQMAP_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<object, object, any>;
  export default component;
}
