import { defineOverridesPreferences } from '@vben/preferences';

import { brandLogo, isHhyyBrand } from '#/utils/brand-assets';

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
    // 仅 hhyy 将 3D 地球看板作为默认首页；其他品牌走分析页
    defaultHomePath: isHhyyBrand
      ? '/dashboard/sea-freight-globe'
      : '/analytics',
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
  },
});
