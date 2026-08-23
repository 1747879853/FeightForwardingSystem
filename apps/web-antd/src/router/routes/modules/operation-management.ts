import type { RouteRecordRaw } from 'vue-router';

import {
  AirExportPlaneIcon,
  SeaExportShipIcon,
  SeaImportShipIcon,
} from '@vben/icons';

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
              keepAlive: true,
              keepAliveName: 'SeaExportAdminForm',
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
              keepAlive: true,
              activePath: '/sea-exports',
              /** query.tab 不参与页签 key，避免进页后改 query 导致整页重挂、回落到基础信息 */
              fullPathKey: false,
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
              keepAlive: true,
              keepAliveName: 'SeaImportAdminForm',
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
              keepAlive: true,
              activePath: '/sea-imports',
              authority: abpPageAuthority('Admin.SeaImport'),
            },
            component: () => import('#/views/sea-import-admin/editor.vue'),
          },
        ],
      },
      {
        meta: {
          icon: AirExportPlaneIcon,
          title: $t('airExport.export.title'),
          hideChildrenInMenu: true,
          authority: abpPageAuthority('Admin.AirExport'),
        },
        name: 'AirExport',
        path: '/air-exports',
        children: [
          {
            path: '',
            name: 'AirExportList',
            meta: {
              keepAlive: true,
              title: $t('airExport.export.title'),
              authority: abpPageAuthority('Admin.AirExport'),
            },
            component: () => import('#/views/air-export-admin/list.vue'),
          },
          {
            path: 'create',
            name: 'AirExportCreate',
            meta: {
              title: $t('airExport.export.title'),
              hideInMenu: true,
              keepAlive: true,
              keepAliveName: 'AirExportAdminForm',
              activePath: '/air-exports',
              authority: abpPageAuthority('Admin.AirExport'),
            },
            component: () =>
              import('#/views/air-export-admin/basic-info-form/form.vue'),
          },
          {
            path: ':id([0-9a-fA-F-]{36})/edit',
            name: 'AirExportEdit',
            meta: {
              title: $t('airExport.export.title'),
              hideInMenu: true,
              keepAlive: true,
              activePath: '/air-exports',
              authority: abpPageAuthority('Admin.AirExport'),
            },
            component: () => import('#/views/air-export-admin/editor.vue'),
          },
        ],
      },
    ],
  },
];

export default routes;
