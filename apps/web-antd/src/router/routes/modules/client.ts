import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:account-multiple-outline',
      order: 100,
      title: $t('seaExport.client.title'),
      hideChildrenInMenu: true,
      authority: abpPageAuthority('Admin.Client'),
    },
    name: 'Client',
    path: '/clients',
    children: [
      {
        path: '',
        name: 'ClientList',
        meta: {
          title: $t('seaExport.client.title'),
          authority: abpPageAuthority('Admin.Client'),
        },
        component: () => import('#/views/client/list.vue'),
      },
      {
        path: 'create',
        name: 'ClientCreate',
        meta: {
          title: $t('seaExport.client.title'),
          hideInMenu: true,
          activePath: '/clients',
          authority: abpPageAuthority('Admin.Client'),
        },
        component: () => import('#/views/client/base/form.vue'),
      },
      {
        path: ':id([0-9a-fA-F-]{36})/edit',
        name: 'ClientEdit',
        meta: {
          title: $t('seaExport.client.title'),
          hideInMenu: true,
          activePath: '/clients',
          authority: abpPageAuthority('Admin.Client'),
        },
        component: () => import('#/views/client/editor.vue'),
      },
    ],
  },
];

export default routes;
