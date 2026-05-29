import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:ship',
      order: 210,
      title: '运价管理',
      authority: abpPageAuthority('Admin.SeFreiPrice'),
    },
    name: 'FreightRate',
    path: '/freight-rate',
    children: [
      {
        path: '',
        name: 'FreightRateList',
        meta: {
          title: '运价管理',
          authority: abpPageAuthority('Admin.SeFreiPrice'),
        },
        component: () =>
          import('#/views/sea-export-admin/freight-rate/list.vue'),
      },
    ],
  },
];

export default routes;
