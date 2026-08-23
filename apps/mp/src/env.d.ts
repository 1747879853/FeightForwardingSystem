/// <reference types="@dcloudio/types" />

interface ImportMetaEnv {
  /** 后端根地址，不带 /api */
  readonly VITE_API_ORIGIN: string;
  /** 'true' 时展示开发态账密登录入口 */
  readonly VITE_ENABLE_PASSWORD_LOGIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<object, object, any>;
  export default component;
}
