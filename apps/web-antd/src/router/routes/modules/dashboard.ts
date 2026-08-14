import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';
import { isHhyyBrand } from '#/utils/brand-assets';

const routes: RouteRecordRaw[] = [
  {
    name: 'Analytics',
    path: '/analytics',
    component: () => import('#/views/dashboard/analytics/index.vue'),
    meta: {
      icon: 'lucide:area-chart',
      order: 0,
      title: $t('page.dashboard.analytics'),
      authority: abpPageAuthority('Page.Home'),
    },
  },
  {
    name: 'Workspace',
    path: '/workspace',
    component: () => import('#/views/dashboard/workspace/index.vue'),
    meta: {
      affixTab: true,
      icon: 'vscode-icons:file-type-go-work',
      order: 1,
      title: $t('page.dashboard.workspace'),
      authority: abpPageAuthority('Admin.Workbench'),
    },
  },
];

/** 海运 3D 地球看板仅浩瀚远洋（hhyy）打包可见 */
if (isHhyyBrand) {
  routes.push({
    name: 'Dashboard',
    path: '/dashboard',
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: $t('page.dashboard.title'),
    },
    children: [
      {
        name: 'SeaFreightGlobe',
        path: 'sea-freight-globe',
        component: () =>
          import('#/views/dashboard/sea-freight-globe/index.vue'),
        meta: {
          icon: 'carbon:earth-filled',
          title: '海运 3D 地球看板',
        },
      },
    ],
  });
}

export default routes;
