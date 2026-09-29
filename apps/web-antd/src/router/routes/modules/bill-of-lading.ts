import type { RouteRecordRaw } from 'vue-router';

import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:files',
      order: 195,
      title: '提单管理',
      hideChildrenInMenu: true,
      authority: abpPageAuthority('Admin.BillOfLading.Get'),
    },
    name: 'BillOfLading',
    path: '/bill-of-lading',
    children: [
      {
        path: '',
        name: 'BillOfLadingList',
        meta: {
          keepAlive: true,
          title: '提单管理',
          authority: abpPageAuthority('Admin.BillOfLading.Get'),
        },
        component: () => import('#/views/bill-of-lading/index.vue'),
      },
    ],
  },
];

export default routes;
