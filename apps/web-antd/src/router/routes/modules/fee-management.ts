import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:cash-multiple',
      order: 201,
      title: $t('seaExport.export.feeManagement'),
      hideChildrenInMenu: false,
      authority: abpPageAuthority([
        'Admin.OrderFee.Lock',
        'Admin.PaymentApplication',
      ]),
    },
    name: 'FeeManagement',
    path: '/fee-management',
    children: [
      {
        path: 'fee-lock',
        name: 'SeaExportFeeLockList',
        meta: {
          icon: 'mdi:lock-outline',
          title: $t('seaExport.export.feeLock.list'),
          authority: abpPageAuthority('Admin.OrderFee.Lock'),
        },
        component: () =>
          import('#/views/fee-management/fee-lock/fee-lock-list.vue'),
      },
      {
        path: 'payment-application',
        name: 'PaymentApplicationList',
        meta: {
          icon: 'mdi:file-document-outline',
          title: $t('seaExport.export.paymentApplication.list'),
          authority: abpPageAuthority('Admin.PaymentApplication'),
        },
        component: () =>
          import('#/views/fee-management/payment-application/list.vue'),
      },
      {
        path: 'payment-application/add',
        name: 'PaymentApplicationAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: $t('seaExport.export.paymentApplication.addTitle'),
          authority: abpPageAuthority('Admin.PaymentApplication'),
          hideInMenu: true,
          activePath: '/fee-management/payment-application',
        },
        component: () =>
          import('#/views/fee-management/payment-application/form.vue'),
      },
      {
        path: 'payment-application/:id/edit',
        name: 'PaymentApplicationEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: $t('seaExport.export.paymentApplication.editTitle'),
          authority: abpPageAuthority('Admin.PaymentApplication'),
          hideInMenu: true,
          activePath: '/fee-management/payment-application',
        },
        component: () =>
          import('#/views/fee-management/payment-application/form.vue'),
      },
      {
        path: 'statement',
        name: 'SeaExportStatementList',
        meta: {
          icon: 'mdi:cash-multiple',
          title: $t('seaExport.export.statement.title'),
          authority: abpPageAuthority('Admin.OrderFee.Lock'),
        },
        component: () => import('#/views/fee-management/statement/index.vue'),
      },
      {
        path: 'statement/create',
        name: 'SeaExportStatementCreate',
        meta: {
          title: $t('seaExport.export.statement.title'),
          hideInMenu: true,
          // activePath: '/fee-management/statement',
        },
        component: () => import('#/views/fee-management/statement/editor.vue'),
      },
      // {
      //   path: ':id([0-9a-fA-F-]{36})/edit',
      //   name: 'SeaExportStatementEdit',
      //   meta: {
      //     title: $t('seaExport.export.statement.title'),
      //     hideInMenu: true,
      //     activePath: '/fee-management/statement',
      //   },
      //   component: () => import('#/views/fee-management/statement/editor.vue'),
      // },
    ],
  },
];

export default routes;
