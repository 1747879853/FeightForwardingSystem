import type { RouteRecordRaw } from 'vue-router';

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
          icon: 'mdi:ferry',
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
          icon: 'mdi:file-document-edit-outline',
          title: '业务联系单',
          hideChildrenInMenu: true,
          authority: abpPageAuthority('Admin.PreOrder'),
        },
        name: 'PreOrder',
        path: '/pre-order',
        children: [
          {
            path: '',
            name: 'PreOrderList',
            meta: {
              keepAlive: true,
              title: '业务联系单',
              authority: abpPageAuthority('Admin.PreOrder'),
            },
            component: () => import('#/views/pre-order/list.vue'),
          },
          {
            path: 'add',
            name: 'PreOrderAdd',
            meta: {
              title: '业务联系单',
              hideInMenu: true,
              activePath: '/pre-order',
              authority: abpPageAuthority('Admin.PreOrder.Add'),
            },
            component: () => import('#/views/pre-order/editor.vue'),
          },
          {
            path: ':id([0-9a-fA-F-]{36})/edit',
            name: 'PreOrderEdit',
            meta: {
              title: '业务联系单',
              hideInMenu: true,
              activePath: '/pre-order',
              authority: abpPageAuthority('Admin.PreOrder'),
            },
            component: () => import('#/views/pre-order/editor.vue'),
          },
          {
            path: ':id([0-9a-fA-F-]{36})/detail',
            name: 'PreOrderDetail',
            meta: {
              title: '业务联系单详情',
              hideInMenu: true,
              activePath: '/pre-order',
              authority: abpPageAuthority('Admin.PreOrder'),
            },
            component: () => import('#/views/pre-order/detail.vue'),
          },
        ],
      },
      {
        meta: {
          icon: 'mdi:ferry',
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
    ],
  },
];

export default routes;
