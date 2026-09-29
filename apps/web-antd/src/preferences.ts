import { defineOverridesPreferences } from '@vben/preferences';

import {
  brandLayoutLogoFull,
  brandLogo,
  defaultHomePath,
} from '#/utils/brand-assets';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    enablePreferences: true,
    name: import.meta.env.VITE_APP_TITLE,
    layout: 'header-sidebar-nav',
    preferencesButtonPosition: 'auto',
    // 浩瀚远洋进 3D 地球看板；其他品牌进工作台
    defaultHomePath,
  },
  theme: {
    mode: 'light',
    radius: '0.5',
  },
  widget: {
    globalSearch: false,
    themeToggle: true,
  },

  breadcrumb: {
    enable: false,
    hideOnlyOne: true,
    showHome: true,
    styleType: 'background',
  },
  sidebar: {
    collapsed: true,
    collapsedButton: false,
    collapsedShowTitle: true,
    fixedButton: false,
  },
  tabbar: {
    middleClickToClose: true,
    showIcon: true,
  },
  transition: {
    name: 'fade',
  },
  logo: {
    source: brandLogo,
    fit: 'contain',
    fullSource: brandLayoutLogoFull,
  },
});
