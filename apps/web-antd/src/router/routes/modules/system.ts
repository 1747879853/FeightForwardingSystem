import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ion:settings-outline',
      order: 9997,
      title: $t('system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        path: '/system/user',
        name: 'SystemUser',
        meta: {
          icon: 'mdi:account',
          title: $t('system.user.title'),
        },
        component: () => import('#/views/system/user/list.vue'),
      },
      {
        path: '/system/role',
        name: 'SystemRole',
        meta: {
          icon: 'mdi:account-group',
          title: $t('system.role.title'),
        },
        component: () => import('#/views/system/role/list.vue'),
      },
      {
        path: '/system/permission',
        name: 'SystemPermission',
        meta: {
          icon: 'mdi:shield-key',
          title: $t('system.permission.title'),
        },
        component: () => import('#/views/system/permission/list.vue'),
      },
      {
        path: '/system/menu',
        name: 'SystemMenu',
        meta: {
          icon: 'mdi:menu',
          title: $t('system.menu.title'),
        },
        component: () => import('#/views/system/menu/list.vue'),
      },
      {
        path: '/system/dept',
        name: 'SystemDept',
        meta: {
          icon: 'charm:organisation',
          title: $t('system.dept.title'),
        },
        component: () => import('#/views/system/dept/list.vue'),
      },
      {
        path: '/system/basic-data',
        name: 'SystemBasicData',
        meta: {
          icon: 'mdi:database-cog-outline',
          title: $t('system.basicData.title'),
        },
        children: [
          {
            path: '/system/basic-data/carrier',
            name: 'SystemBasicDataCarrier',
            meta: {
              icon: 'mdi:ferry',
              title: $t('system.basicData.carrier.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CarrierAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-invoice',
            name: 'SystemBasicDataCodeInvoice',
            meta: {
              icon: 'mdi:file-document-outline',
              title: $t('system.basicData.codeInvoice.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodeInvoiceAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-service',
            name: 'SystemBasicDataCodeService',
            meta: {
              icon: 'mdi:truck-delivery-outline',
              title: $t('system.basicData.codeService.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodeServiceAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-goods',
            name: 'SystemBasicDataCodeGoods',
            meta: {
              icon: 'mdi:package-variant',
              title: $t('system.basicData.codeGoods.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodeGoodsAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-package',
            name: 'SystemBasicDataCodePackage',
            meta: {
              icon: 'mdi:cube-outline',
              title: $t('system.basicData.codePackage.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodePackageAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-issue-type',
            name: 'SystemBasicDataCodeIssueType',
            meta: {
              icon: 'mdi:file-sign',
              title: $t('system.basicData.codeIssueType.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodeIssueTypeAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-source',
            name: 'SystemBasicDataCodeSource',
            meta: {
              icon: 'mdi:source-branch',
              title: $t('system.basicData.codeSource.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodeSourceAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/code-frt',
            name: 'SystemBasicDataCodeFrt',
            meta: {
              icon: 'mdi:cash-multiple',
              title: $t('system.basicData.codeFrt.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CodeFrtAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/currency',
            name: 'SystemBasicDataCurrency',
            meta: {
              icon: 'mdi:currency-usd',
              title: $t('system.basicData.currency.title'),
            },
            component: () =>
              import('#/views/system/basic-data/CurrencyAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/fee-name',
            name: 'SystemBasicDataFeeName',
            meta: {
              icon: 'mdi:receipt-text-outline',
              title: $t('system.basicData.feeName.title'),
            },
            component: () =>
              import('#/views/system/basic-data/FeeNameAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/exchange-rate',
            name: 'SystemBasicDataExchangeRate',
            meta: {
              icon: 'mdi:chart-line',
              title: $t('system.basicData.exchangeRate.title'),
            },
            component: () =>
              import('#/views/system/basic-data/ExchangeRateAdmin/list.vue'),
          },
        ],
      },
    ],
  },
];

export default routes;
