import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:ship',
      order: 210,
      title: '运价管理',
    },
    name: 'FreightRate',
    path: '/freight-rate',
    children: [
      {
        path: '',
        name: 'FreightRateList',
        meta: {
          title: '运价管理',
        },
        component: () =>
          import('#/views/sea-export-admin/freight-rate/list.vue'),
      },
    ],
  },
];

export default routes;
