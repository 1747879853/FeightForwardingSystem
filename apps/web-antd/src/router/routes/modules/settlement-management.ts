import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:cash-register',
      order: 300,
      title: '结算管理',
      hideChildrenInMenu: false,
      authority: abpPageAuthority(['Admin.PaymentSettlement']),
    },
    name: 'SettlementManagement',
    path: '/settlement-management',
    children: [
      {
        path: 'payment-settlement',
        name: 'PaymentSettlementList',
        meta: {
          icon: 'mdi:file-document-multiple-outline',
          keepAlive: true,
          title: '付费结算',
          authority: abpPageAuthority('Admin.PaymentSettlement.Get'),
        },
        component: () =>
          import('#/views/settlement-management/payment-settlement/list.vue'),
      },
      {
        path: 'payment-settlement/add',
        name: 'PaymentSettlementAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '新建付费结算',
          authority: abpPageAuthority('Admin.PaymentSettlement.Add'),
          hideInMenu: true,
          activePath: '/settlement-management/payment-settlement',
        },
        component: () =>
          import('#/views/settlement-management/payment-settlement/form.vue'),
      },
      {
        path: 'payment-settlement/:id/edit',
        name: 'PaymentSettlementEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '编辑付费结算',
          authority: abpPageAuthority('Admin.PaymentSettlement.Edit'),
          hideInMenu: true,
          activePath: '/settlement-management/payment-settlement',
        },
        component: () =>
          import('#/views/settlement-management/payment-settlement/form.vue'),
      },
    ],
  },
];

export default routes;
