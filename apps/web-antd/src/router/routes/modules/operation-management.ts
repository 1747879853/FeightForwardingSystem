import type { RouteRecordRaw } from 'vue-router';

import { SeaExportShipIcon, SeaImportShipIcon } from '@vben/icons';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'streamline-freehand-color:office-work-wireless',
      order: 195,
      title: '操作管理',
      authority: abpPageAuthority('Admin.SeaExport'),
    },
    name: 'OperationManagement',
    path: '/operation-management',
    children: [
      {
        meta: {
          icon: SeaExportShipIcon,
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
      {
        meta: {
          icon: SeaImportShipIcon,
          title: $t('seaImport.import.title'),
          hideChildrenInMenu: true,
          authority: abpPageAuthority('Admin.SeaImport'),
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
              authority: abpPageAuthority('Admin.SeaImport'),
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
              authority: abpPageAuthority('Admin.SeaImport'),
            },
            component: () =>
              import('#/views/sea-import-admin/basic-info-form/form.vue'),
          },
          {
            path: ':id([0-9a-fA-F-]{36})/edit',
            name: 'SeaImportEdit',
            meta: {
              title: $t('seaImport.import.title'),
              hideInMenu: true,
              activePath: '/sea-imports',
              authority: abpPageAuthority('Admin.SeaImport'),
            },
            component: () => import('#/views/sea-import-admin/editor.vue'),
          },
        ],
      },
    ],
  },
];

export default routes;
