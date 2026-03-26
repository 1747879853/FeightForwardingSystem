import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:ferry',
      order: 200,
      title: $t('seaExport.export.title'),
      hideChildrenInMenu: true,
    },
    name: 'SeaExport',
    path: '/sea-exports',
    children: [
      {
        path: '',
        name: 'SeaExportList',
        meta: {
          title: $t('seaExport.export.title'),
        },
        component: () => import('#/views/sea-export/sea-export-admin/list.vue'),
      },
      {
        path: 'create',
        name: 'SeaExportCreate',
        meta: {
          title: $t('seaExport.export.title'),
          hideInMenu: true,
          activePath: '/sea-exports',
        },
        component: () => import('#/views/sea-export/sea-export-admin/form.vue'),
      },
      {
        path: ':id/edit',
        name: 'SeaExportEdit',
        meta: {
          title: $t('seaExport.export.title'),
          hideInMenu: true,
          activePath: '/sea-exports',
        },
        component: () =>
          import('#/views/sea-export/sea-export-admin/editor.vue'),
      },
    ],
  },
];

export default routes;
