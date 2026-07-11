import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:ferry',
      order: 200,
      title: $t('seaExport.export.title'),
      hideChildrenInMenu: true,
      authority: abpPageAuthority('Admin.SeaExport'),
    },
    name: 'SeaExport',
    path: '/sea-exports',
    children: [
      {
        path: '',
        name: 'SeaExportList',
        meta: {
          keepAlive: true,
          title: $t('seaExport.export.title'),
          authority: abpPageAuthority('Admin.SeaExport'),
        },
        component: () => import('#/views/sea-export-admin/list.vue'),
      },
      {
        path: 'create',
        name: 'SeaExportCreate',
        meta: {
          title: $t('seaExport.export.title'),
          hideInMenu: true,
          activePath: '/sea-exports',
          authority: abpPageAuthority('Admin.SeaExport'),
        },
        component: () =>
          import('#/views/sea-export-admin/basic-info-form/form.vue'),
      },
      {
        path: ':id([0-9a-fA-F-]{36})/edit',
        name: 'SeaExportEdit',
        meta: {
          title: $t('seaExport.export.title'),
          hideInMenu: true,
          activePath: '/sea-exports',
          authority: abpPageAuthority('Admin.SeaExport'),
        },
        component: () => import('#/views/sea-export-admin/editor.vue'),
      },
    ],
  },
];

export default routes;
