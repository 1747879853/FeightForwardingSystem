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
        'Admin.Statement',
        'Admin.InvoiceIssue',
        'Admin.InvoiceApplication',
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
          keepAlive: true,
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
          keepAlive: true,
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
        name: 'StatementList',
        meta: {
          icon: 'mdi:cash-multiple',
          keepAlive: true,
          title: $t('seaExport.export.statement.title'),
          authority: abpPageAuthority('Admin.Statement'),
        },
        component: () => import('#/views/fee-management/statement/index.vue'),
      },
      {
        path: 'statement/add',
        name: 'StatementAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: $t('seaExport.export.statement.addTitle'),
          authority: abpPageAuthority('Admin.Statement'),
          hideInMenu: true,
          activePath: '/fee-management/statement',
        },
        component: () => import('#/views/fee-management/statement/editor.vue'),
      },
      {
        path: 'statement/:id/edit',
        name: 'StatementEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: $t('seaExport.export.statement.editTitle'),
          authority: abpPageAuthority('Admin.Statement'),
          hideInMenu: true,
          activePath: '/fee-management/statement',
        },
        component: () => import('#/views/fee-management/statement/editor.vue'),
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
          import('#/views/fee-management/invoice-issue/list.vue'),
      },
      {
        path: 'invoice-issue/add',
        name: 'InvoiceIssueAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '新建发票开出',
          authority: abpPageAuthority('Admin.InvoiceIssue.Add'),
          hideInMenu: true,
          activePath: '/fee-management/invoice-issue',
        },
        component: () =>
          import('#/views/fee-management/invoice-issue/form.vue'),
      },
      {
        path: 'invoice-issue/:id/edit',
        name: 'InvoiceIssueEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '编辑发票开出',
          authority: abpPageAuthority('Admin.InvoiceIssue.Edit'),
          hideInMenu: true,
          activePath: '/fee-management/invoice-issue',
        },
        component: () =>
          import('#/views/fee-management/invoice-issue/form.vue'),
      },
      {
        path: 'invoice-application',
        name: 'InvoiceApplicationList',
        meta: {
          icon: 'mdi:file-document-outline',
          keepAlive: true,
          title: '发票申请',
          authority: abpPageAuthority('Admin.InvoiceApplication.Get'),
        },
        component: () =>
          import('#/views/fee-management/invoice-application/list.vue'),
      },
      {
        path: 'invoice-application/add',
        name: 'InvoiceApplicationAdd',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '新建发票申请',
          authority: abpPageAuthority('Admin.InvoiceApplication.Add'),
          hideInMenu: true,
          activePath: '/fee-management/invoice-application',
        },
        component: () =>
          import('#/views/fee-management/invoice-application/form.vue'),
      },
      {
        path: 'invoice-application/:id/edit',
        name: 'InvoiceApplicationEdit',
        meta: {
          icon: 'mdi:file-document-edit-outline',
          title: '编辑发票申请',
          authority: abpPageAuthority('Admin.InvoiceApplication.Edit'),
          hideInMenu: true,
          activePath: '/fee-management/invoice-application',
        },
        component: () =>
          import('#/views/fee-management/invoice-application/form.vue'),
      },
    ],
  },
];

export default routes;
