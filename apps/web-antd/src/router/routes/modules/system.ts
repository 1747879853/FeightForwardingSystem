import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ion:settings-outline',
      order: 9997,
      title: $t('system.title'),
      // 系统管理模块：拥有 Admin 或 Admin.Get 权限即可访问
      authority: abpPageAuthority('Admin'),
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
          // 用户管理：拥有 Admin.Team.User 或 Admin.Team.User.Get 权限
          authority: abpPageAuthority('Admin.Team.User'),
        },
        component: () => import('#/views/system/user/list.vue'),
      },
      {
        path: '/system/role',
        name: 'SystemRole',
        meta: {
          icon: 'mdi:account-group',
          title: $t('system.role.title'),
          // 角色管理：拥有 Admin.Team.Role 或 Admin.Team.Role.Get 权限
          authority: abpPageAuthority('Admin.Team.Role'),
        },
        component: () => import('#/views/system/role/list.vue'),
      },
      {
        path: '/system/permission',
        name: 'SystemPermission',
        meta: {
          icon: 'mdi:shield-key',
          title: $t('system.permission.title'),
          // 权限管理：拥有 Admin.Permission 或 Admin.Permission.Get 权限
          // TODO后台还没有分出来权限菜单，暂时用用户权限范围字段代替
          authority: abpPageAuthority('Admin.UserDataPermission'),
        },
        component: () => import('#/views/system/permission/list.vue'),
      },
      // {
      //   path: '/system/menu',
      //   name: 'SystemMenu',
      //   meta: {
      //     icon: 'mdi:menu',
      //     title: $t('system.menu.title'),
      //   },
      //   component: () => import('#/views/system/menu/list.vue'),
      // },
      {
        path: '/system/dept',
        name: 'SystemDept',
        meta: {
          icon: 'charm:organisation',
          title: $t('system.dept.title'),
          // 部门管理：拥有 Admin.Team.Organization 或 Admin.Team.Organization.Get 权限
          authority: abpPageAuthority('Admin.Team.Organization'),
        },
        component: () => import('#/views/system/dept/list.vue'),
      },
      {
        path: '/system/basic-data',
        name: 'SystemBasicData',
        meta: {
          icon: 'mdi:database-cog-outline',
          title: $t('system.basicData.title'),
          // 基础数据模块：后端没有 BasicData 权限，使用子菜单权限组合
          // 只要拥有任一子菜单权限即可访问父级菜单
          authority: abpPageAuthority([
            'Admin.Carrier',
            'Admin.CodeInvoice',
            'Admin.CodeService',
            'Admin.CodeGoods',
            'Admin.CodePackage',
            'Admin.CodeIssueType',
            'Admin.CodeSource',
            'Admin.CodeFrt',
            'Admin.Currency',
            'Admin.FeeName',
            'Admin.FeeCode',
            'Admin.ExchangeRate',
            'Admin.LaneCode',
            'Admin.PortCode',
            'Admin.CtnCode',
            'Admin.CountryCode',
            'Admin.GenerateNum',
          ]),
        },
        children: [
          {
            path: '/system/basic-data/carrier',
            name: 'SystemBasicDataCarrier',
            meta: {
              icon: 'mdi:ferry',
              title: $t('system.basicData.carrier.title'),
              authority: abpPageAuthority('Admin.Carrier'),
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
              authority: abpPageAuthority('Admin.CodeInvoice'),
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
              authority: abpPageAuthority('Admin.CodeService'),
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
              authority: abpPageAuthority('Admin.CodeGoods'),
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
              authority: abpPageAuthority('Admin.CodePackage'),
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
              authority: abpPageAuthority('Admin.CodeIssueType'),
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
              authority: abpPageAuthority('Admin.CodeSource'),
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
              authority: abpPageAuthority('Admin.CodeFrt'),
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
              authority: abpPageAuthority('Admin.Currency'),
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
              authority: abpPageAuthority('Admin.FeeName'),
            },
            component: () =>
              import('#/views/system/basic-data/FeeNameAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/fee-code',
            name: 'SystemBasicDataFeeCode',
            meta: {
              icon: 'mdi:code-tags',
              title: $t('system.basicData.feeCode.title'),
              authority: abpPageAuthority('Admin.FeeCode'),
            },
            component: () =>
              import('#/views/system/basic-data/FeeCodeAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/exchange-rate',
            name: 'SystemBasicDataExchangeRate',
            meta: {
              icon: 'mdi:chart-line',
              title: $t('system.basicData.exchangeRate.title'),
              authority: abpPageAuthority('Admin.ExchangeRate'),
            },
            component: () =>
              import('#/views/system/basic-data/ExchangeRateAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/lane-code',
            name: 'SystemBasicDataLaneCode',
            meta: {
              icon: 'mdi:highway',
              title: $t('system.basicData.laneCode.title'),
              // authority: abpPageAuthority('Admin.LaneCode'),
            },
            component: () =>
              import('#/views/system/basic-data/LaneCodeAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/port-code',
            name: 'SystemBasicDataPortCode',
            meta: {
              icon: 'mdi:anchor',
              title: $t('system.basicData.portCode.title'),
              // authority: abpPageAuthority('Admin.PortCode'),
            },
            component: () =>
              import('#/views/system/basic-data/PortCodeAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/ctn-code',
            name: 'SystemBasicDataCtnCode',
            meta: {
              icon: 'mdi:train-car-container',
              title: $t('system.basicData.ctnCode.title'),
              // authority: abpPageAuthority('Admin.CtnCode'),
            },
            component: () =>
              import('#/views/system/basic-data/CtnCodeAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/country-code',
            name: 'SystemBasicDataCountryCode',
            meta: {
              icon: 'mdi:earth',
              title: $t('system.basicData.countryCode.title'),
              // authority: abpPageAuthority('Admin.CountryCode'),
            },
            component: () =>
              import('#/views/system/basic-data/CountryCodeAdmin/list.vue'),
          },
          {
            path: '/system/basic-data/generate-num',
            name: 'SystemBasicDataGenerateNum',
            meta: {
              icon: 'mdi:format-list-numbered',
              title: $t('system.basicData.generateNum.title'),
              authority: abpPageAuthority('Admin.GenerateNum'),
            },
            component: () =>
              import('#/views/system/basic-data/GenerateNumAdmin/list.vue'),
          },
        ],
      },
    ],
  },
];

export default routes;
