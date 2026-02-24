import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:ferry',
      order: 100,
      title: $t('seaExport.title'),
    },
    name: 'SeaExport',
    path: '/sea-export',
    children: [
      {
        path: '/sea-export/clients',
        name: 'SeaExportClients',
        meta: {
          icon: 'mdi:account-multiple-outline',
          title: $t('seaExport.client.title'),
        },
        component: () => import('#/views/sea-export/client/list.vue'),
      },
      {
        path: '/sea-export/clients/create',
        name: 'SeaExportClientCreate',
        meta: {
          title: $t('seaExport.client.title'),
          hideInMenu: true,
          activePath: '/sea-export/clients',
        },
        component: () => import('#/views/sea-export/client/form.vue'),
      },
      {
        path: '/sea-export/clients/:id/edit',
        name: 'SeaExportClientEdit',
        meta: {
          title: $t('seaExport.client.title'),
          hideInMenu: true,
          activePath: '/sea-export/clients',
        },
        component: () => import('#/views/sea-export/client/form.vue'),
      },
    ],
  },
];

export default routes;
