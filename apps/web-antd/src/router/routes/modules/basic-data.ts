import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'streamline-plump-color:horizontal-menu-circle',
      keepAlive: true,
      order: 9996,
      title: $t('system.basicData.title'),
      authority: abpPageAuthority([
        'Admin.Carrier',
        'Admin.CodeInvoice',
        'Admin.CodeService',
        'Admin.CodeGoods',
        'Admin.CodePackage',
        'Admin.CodeIssueType',
        'Admin.AttachmentDtlType',
        'Admin.CodeSource',
        'Admin.CodeFrt',
        'Admin.Currency',
        'Admin.FeeName',
        'Admin.FeeCode',
        'Admin.LaneCode',
        'Admin.PortCode',
        'Admin.AirPort',
        'Admin.CtnCode',
        'Admin.CountryCode',
        'Admin.GenerateNum',
        'Admin.ServiceConfig.SeServiceConfig',
        'Admin.OrderFeeTemplate',
      ]),
    },
    name: 'BasicData',
    path: '/basic-data',
    children: [
      {
        path: '/basic-data/carrier',
        name: 'BasicDataCarrier',
        meta: {
          icon: 'mdi:ferry',
          keepAlive: true,
          title: $t('system.basicData.carrier.title'),
          authority: abpPageAuthority('Admin.Carrier'),
        },
        component: () =>
          import('#/views/system/basic-data/CarrierAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-invoice',
        name: 'BasicDataCodeInvoice',
        meta: {
          icon: 'mdi:file-document-outline',
          keepAlive: true,
          title: $t('system.basicData.codeInvoice.title'),
          authority: abpPageAuthority('Admin.CodeInvoice'),
        },
        component: () =>
          import('#/views/system/basic-data/CodeInvoiceAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-service',
        name: 'BasicDataCodeService',
        meta: {
          icon: 'mdi:truck-delivery-outline',
          keepAlive: true,
          title: $t('system.basicData.codeService.title'),
          authority: abpPageAuthority('Admin.CodeService'),
        },
        component: () =>
          import('#/views/system/basic-data/CodeServiceAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-goods',
        name: 'BasicDataCodeGoods',
        meta: {
          icon: 'mdi:package-variant',
          keepAlive: true,
          title: $t('system.basicData.codeGoods.title'),
          authority: abpPageAuthority('Admin.CodeGoods'),
        },
        component: () =>
          import('#/views/system/basic-data/CodeGoodsAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-package',
        name: 'BasicDataCodePackage',
        meta: {
          icon: 'mdi:cube-outline',
          keepAlive: true,
          title: $t('system.basicData.codePackage.title'),
          authority: abpPageAuthority('Admin.CodePackage'),
        },
        component: () =>
          import('#/views/system/basic-data/CodePackageAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-issue-type',
        name: 'BasicDataCodeIssueType',
        meta: {
          icon: 'mdi:file-sign',
          keepAlive: true,
          title: $t('system.basicData.codeIssueType.title'),
          authority: abpPageAuthority('Admin.CodeIssueType'),
        },
        component: () =>
          import('#/views/system/basic-data/CodeIssueTypeAdmin/list.vue'),
      },
      {
        path: '/basic-data/attachment-dtl-type',
        name: 'BasicDataAttachmentDtlType',
        meta: {
          icon: 'mdi:paperclip',
          keepAlive: true,
          title: $t('system.basicData.attachmentDtlType.title'),
          authority: abpPageAuthority('Admin.AttachmentDtlType'),
        },
        component: () =>
          import('#/views/system/basic-data/AttachmentDtlTypeAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-source',
        name: 'BasicDataCodeSource',
        meta: {
          icon: 'mdi:source-branch',
          keepAlive: true,
          title: $t('system.basicData.codeSource.title'),
          authority: abpPageAuthority('Admin.CodeSource'),
        },
        component: () =>
          import('#/views/system/basic-data/CodeSourceAdmin/list.vue'),
      },
      {
        path: '/basic-data/code-frt',
        name: 'BasicDataCodeFrt',
        meta: {
          icon: 'mdi:cash-multiple',
          keepAlive: true,
          title: $t('system.basicData.codeFrt.title'),
          authority: abpPageAuthority('Admin.CodeFrt'),
        },
        component: () =>
          import('#/views/system/basic-data/CodeFrtAdmin/list.vue'),
      },
      {
        path: '/basic-data/currency',
        name: 'BasicDataCurrency',
        meta: {
          icon: 'mdi:currency-usd',
          keepAlive: true,
          title: $t('system.basicData.currency.title'),
          authority: abpPageAuthority('Admin.Currency'),
        },
        component: () =>
          import('#/views/system/basic-data/CurrencyAdmin/list.vue'),
      },
      {
        path: '/basic-data/fee-name',
        name: 'BasicDataFeeName',
        meta: {
          icon: 'mdi:receipt-text-outline',
          keepAlive: true,
          title: $t('system.basicData.feeName.title'),
          authority: abpPageAuthority('Admin.FeeName'),
        },
        component: () =>
          import('#/views/system/basic-data/FeeNameAdmin/list.vue'),
      },
      {
        path: '/basic-data/fee-code',
        name: 'BasicDataFeeCode',
        meta: {
          icon: 'mdi:code-tags',
          keepAlive: true,
          title: $t('system.basicData.feeCode.title'),
          authority: abpPageAuthority('Admin.FeeCode'),
        },
        component: () =>
          import('#/views/system/basic-data/FeeCodeAdmin/list.vue'),
      },
      {
        path: '/basic-data/lane-code',
        name: 'BasicDataLaneCode',
        meta: {
          icon: 'mdi:highway',
          keepAlive: true,
          title: $t('system.basicData.laneCode.title'),
          authority: abpPageAuthority('Admin.LaneCode'),
        },
        component: () =>
          import('#/views/system/basic-data/LaneCodeAdmin/list.vue'),
      },
      {
        path: '/basic-data/port-code',
        name: 'BasicDataPortCode',
        meta: {
          icon: 'mdi:anchor',
          keepAlive: true,
          title: $t('system.basicData.portCode.title'),
          authority: abpPageAuthority('Admin.PortCode'),
        },
        component: () =>
          import('#/views/system/basic-data/PortCodeAdmin/list.vue'),
      },
      {
        path: '/basic-data/air-port',
        name: 'BasicDataAirPort',
        meta: {
          icon: 'mdi:airplane-takeoff',
          keepAlive: true,
          title: $t('system.basicData.airPort.title'),
          authority: abpPageAuthority('Admin.AirPort'),
        },
        component: () =>
          import('#/views/system/basic-data/AirPortAdmin/list.vue'),
      },
      {
        path: '/basic-data/ctn-code',
        name: 'BasicDataCtnCode',
        meta: {
          icon: 'mdi:train-car-container',
          keepAlive: true,
          title: $t('system.basicData.ctnCode.title'),
          authority: abpPageAuthority('Admin.CtnCode'),
        },
        component: () =>
          import('#/views/system/basic-data/CtnCodeAdmin/list.vue'),
      },
      {
        path: '/basic-data/country-code',
        name: 'BasicDataCountryCode',
        meta: {
          icon: 'mdi:earth',
          keepAlive: true,
          title: $t('system.basicData.countryCode.title'),
          authority: abpPageAuthority('Admin.CountryCode'),
        },
        component: () =>
          import('#/views/system/basic-data/CountryCodeAdmin/list.vue'),
      },
      {
        path: '/basic-data/generate-num',
        name: 'BasicDataGenerateNum',
        meta: {
          icon: 'mdi:format-list-numbered',
          keepAlive: true,
          title: $t('system.basicData.generateNum.title'),
          authority: abpPageAuthority('Admin.GenerateNum'),
        },
        component: () =>
          import('#/views/system/basic-data/GenerateNumAdmin/list.vue'),
      },
      {
        path: '/basic-data/se-service-config',
        name: 'BasicDataSeServiceConfig',
        meta: {
          icon: 'mdi:ship-wheel',
          keepAlive: true,
          title: $t('system.basicData.seServiceConfig.title'),
          authority: abpPageAuthority('Admin.ServiceConfig.SeServiceConfig'),
        },
        component: () =>
          import('#/views/system/basic-data/SeServiceConfigAdmin/list.vue'),
      },
      {
        path: '/basic-data/order-fee-template',
        name: 'BasicDataOrderFeeTemplate',
        meta: {
          icon: 'mdi:receipt-text-outline',
          keepAlive: true,
          title: $t('system.basicData.orderFeeTemplate.title'),
          authority: abpPageAuthority('Admin.OrderFeeTemplate'),
        },
        component: () =>
          import('#/views/system/basic-data/OrderFeeTemplateAdmin/list.vue'),
      },
      {
        path: '/basic-data/order-fee-template/edit',
        name: 'BasicDataOrderFeeTemplateEdit',
        meta: {
          title: $t('system.basicData.orderFeeTemplate.editTitle'),
          hideInMenu: true,
          keepAlive: true,
          authority: abpPageAuthority('Admin.OrderFeeTemplate'),
        },
        component: () =>
          import('#/views/system/basic-data/OrderFeeTemplateAdmin/edit.vue'),
      },
    ],
  },
];

export default routes;
