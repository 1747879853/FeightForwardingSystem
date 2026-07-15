import type { RouteRecordRaw } from 'vue-router';

import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:calendar-clock',
      order: 191,
      title: '船期管理',
      authority: abpPageAuthority('Admin.Schedule'),
    },
    name: 'Schedule',
    path: '/schedule',
    children: [
      {
        path: '',
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
