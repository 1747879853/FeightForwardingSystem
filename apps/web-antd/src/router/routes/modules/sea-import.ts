import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:ferry',
      order: 201,
      title: $t('seaImport.import.title'),
      hideChildrenInMenu: true,
    },
    name: 'SeaImport',
    path: '/sea-imports',
    children: [
      {
        path: '',
        name: 'SeaImportList',
        meta: {
          title: $t('seaImport.import.title'),
        },
        component: () => import('#/views/sea-import-admin/list.vue'),
      },
      {
        path: 'create',
        name: 'SeaImportCreate',
        meta: {
          title: $t('seaImport.import.title'),
          hideInMenu: true,
          activePath: '/sea-imports',
        },
        component: () => import('#/views/sea-import-admin/form.vue'),
      },
      {
        path: ':id([0-9a-fA-F-]{36})/edit',
        name: 'SeaImportEdit',
        meta: {
          title: $t('seaImport.import.title'),
          hideInMenu: true,
          activePath: '/sea-imports',
        },
        component: () => import('#/views/sea-import-admin/editor.vue'),
      },
    ],
  },
];

export default routes;
