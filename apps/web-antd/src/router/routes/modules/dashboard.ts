import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'Analytics',
    path: '/analytics',
    component: () => import('#/views/dashboard/analytics/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:area-chart',
      order: 0,
      title: $t('page.dashboard.analytics'),
    },
  },
  {
    name: 'Workspace',
    path: '/workspace',
    component: () => import('#/views/dashboard/workspace/index.vue'),
    meta: {
      icon: 'carbon:workspace',
      order: 1,
      title: $t('page.dashboard.workspace'),
    },
  },
  {
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
  },
];

export default routes;
