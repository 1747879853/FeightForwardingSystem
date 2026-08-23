import type { RouteRecordRaw } from 'vue-router';

import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:file-document-edit-outline',
      order: 194,
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
          keepAlive: true,
          keepAliveName: 'PreOrderEditor',
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
          keepAlive: true,
          keepAliveName: 'PreOrderEditor',
          activePath: '/pre-order',
          authority: abpPageAuthority('Admin.PreOrder'),
        },
        component: () => import('#/views/pre-order/editor.vue'),
      },
      {
        // 兼容历史 /detail 书签，统一落到编辑页
        path: ':id([0-9a-fA-F-]{36})/detail',
        name: 'PreOrderDetail',
        meta: {
          title: '业务联系单',
          hideInMenu: true,
          activePath: '/pre-order',
          authority: abpPageAuthority('Admin.PreOrder'),
        },
        redirect: (to) => `/pre-order/${to.params.id}/edit`,
      },
    ],
  },
];

export default routes;
