import type { RouteRecordRaw } from 'vue-router';

import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:bank-transfer',
      order: 310,
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
];

export default routes;
