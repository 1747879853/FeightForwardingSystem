import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:ferry',
      order: 201,
      title: $t('seaImport.import.title'),
      hideChildrenInMenu: true,
      authority: abpPageAuthority('Admin.SeaExport'),
    },
    name: 'SeaImport',
    path: '/sea-imports',
    children: [
      {
        path: '',
        name: 'SeaImportList',
        meta: {
          keepAlive: true,
          title: $t('seaImport.import.title'),
          authority: abpPageAuthority('Admin.SeaExport'),
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
          authority: abpPageAuthority('Admin.SeaExport'),
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
          authority: abpPageAuthority('Admin.SeaExport'),
        },
        component: () => import('#/views/sea-import-admin/editor.vue'),
      },
    ],
  },
];

export default routes;
