import type { RouteRecordRaw } from 'vue-router';

import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'emojione:ship',
      order: 190,
      title: '航线管理',
      authority: abpPageAuthority(['Admin.SeFreiPrice', 'Admin.Schedule']),
    },
    name: 'FreightRate',
    path: '/freight-rate',
    children: [
      {
        path: '',
        name: 'FreightRateList',
        meta: {
          icon: 'lucide:ship',
          keepAlive: true,
          title: '运价查询',
          authority: abpPageAuthority('Admin.SeFreiPrice'),
        },
        component: () =>
          import('#/views/sea-export-admin/freight-rate/list.vue'),
      },
      {
        path: '/schedule',
        name: 'ScheduleQueryList',
        meta: {
          icon: 'mdi:ferry',
          keepAlive: true,
          title: '船期查询',
          authority: abpPageAuthority('Admin.Schedule'),
        },
        component: () => import('#/views/schedule-query/list.vue'),
      },
    ],
  },
];

export default routes;
