import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:cash-register',
      order: 220,
      title: '财务管理',
      hideChildrenInMenu: false,
      authority: abpPageAuthority([
        'Admin.PaymentSettlement',
        'Admin.InvoiceIssue.Get',
        'Admin.BankStatement',
        'Admin.OrderFee.Lock',
        'Admin.ExchangeRate',
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
      {
        meta: {
          icon: 'mdi:bank-transfer',
          title: '银行流水',
          hideChildrenInMenu: true,
          authority: abpPageAuthority('Admin.BankStatement'),
        },
        name: 'BankStatement',
        path: '/bank-statement',
        children: [
          {
            path: '',
            name: 'BankStatementList',
            meta: {
              icon: 'mdi:bank-transfer',
              keepAlive: true,
              title: '银行流水',
              authority: abpPageAuthority('Admin.BankStatement'),
              hideInMenu: true,
            },
            component: () => import('#/views/bank-statement/list.vue'),
          },
          {
            path: 'add',
            name: 'BankStatementAdd',
            meta: {
              icon: 'mdi:bank-transfer',
              title: '新建银行流水',
              authority: abpPageAuthority('Admin.BankStatement'),
              hideInMenu: true,
              activePath: '/bank-statement',
            },
            component: () => import('#/views/bank-statement/form.vue'),
          },
          {
            path: 'edit/:id',
            name: 'BankStatementEdit',
            meta: {
              icon: 'mdi:bank-transfer',
              title: '编辑银行流水',
              authority: abpPageAuthority('Admin.BankStatement'),
              hideInMenu: true,
              activePath: '/bank-statement',
            },
            component: () => import('#/views/bank-statement/form.vue'),
          },
        ],
      },
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
        path: 'exchange-rate',
        name: 'ExchangeRateList',
        meta: {
          icon: 'mdi:chart-line',
          keepAlive: true,
          title: $t('system.basicData.exchangeRate.title'),
          authority: abpPageAuthority('Admin.ExchangeRate'),
        },
        component: () =>
          import('#/views/system/basic-data/ExchangeRateAdmin/list.vue'),
      },
    ],
  },
];

export default routes;
