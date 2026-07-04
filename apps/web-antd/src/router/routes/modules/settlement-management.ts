import type { RouteRecordRaw } from 'vue-router';

import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:cash-register',
      order: 300,
      title: '结算管理',
      hideChildrenInMenu: false,
      authority: abpPageAuthority([
        'Admin.PaymentSettlement',
        'Admin.ReceiveSettlement',
        'Admin.InvoiceIssue.Get',
      ]),
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
        path: 'payment-settlement/edit/:id',
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
      {
        path: 'receive-settlement',
        name: 'ReceiveSettlementList',
        meta: {
          icon: 'mdi:file-document-check-outline',
          keepAlive: true,
          title: '收费结算',
          authority: abpPageAuthority('Admin.ReceiveSettlement.Get'),
        },
        component: () =>
          import('#/views/settlement-management/receive-settlement/list.vue'),
      },
      {
        path: 'receive-settlement/add',
        name: 'ReceiveSettlementAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '新建收费结算',
          authority: abpPageAuthority('Admin.ReceiveSettlement.Add'),
          hideInMenu: true,
          activePath: '/settlement-management/receive-settlement',
        },
        component: () =>
          import('#/views/settlement-management/receive-settlement/form.vue'),
      },
      {
        path: 'receive-settlement/edit/:id',
        name: 'ReceiveSettlementEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '编辑收费结算',
          authority: abpPageAuthority('Admin.ReceiveSettlement.Get'),
          hideInMenu: true,
          activePath: '/settlement-management/receive-settlement',
        },
        component: () =>
          import('#/views/settlement-management/receive-settlement/form.vue'),
      },
      {
        path: 'invoice-issue',
        name: 'InvoiceIssueList',
        meta: {
          icon: 'mdi:receipt-text-outline',
          keepAlive: true,
          title: '发票开出',
          authority: abpPageAuthority('Admin.InvoiceIssue.Get'),
        },
        component: () =>
          import('#/views/settlement-management/invoice-issue/list.vue'),
      },
      {
        path: 'invoice-issue/add',
        name: 'InvoiceIssueAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '新建发票开出',
          authority: abpPageAuthority('Admin.InvoiceIssue.Add'),
          hideInMenu: true,
          activePath: '/settlement-management/invoice-issue',
        },
        component: () =>
          import('#/views/settlement-management/invoice-issue/form.vue'),
      },
      {
        path: 'invoice-issue/:id/edit',
        name: 'InvoiceIssueEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '编辑发票开出',
          authority: abpPageAuthority('Admin.InvoiceIssue.Edit'),
          hideInMenu: true,
          activePath: '/settlement-management/invoice-issue',
        },
        component: () =>
          import('#/views/settlement-management/invoice-issue/form.vue'),
      },
    ],
  },
];

export default routes;
