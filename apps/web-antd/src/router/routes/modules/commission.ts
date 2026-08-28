import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

/**
 * 提成管理：一级菜单 + 销售提成 / 操作提成两个二级菜单。
 * 两个列表页共用同一组件，靠 meta.commissionType 参数化（0=销售 1=操作）。
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:badge-percent',
      order: 240,
      title: $t('commissionOrder.menu.commissionManagement'),
      hideChildrenInMenu: false,
      authority: abpPageAuthority('Admin.CommissionOrder'),
    },
    name: 'CommissionManagement',
    path: '/commission',
    children: [
      {
        path: 'sales',
        name: 'CommissionSalesList',
        meta: {
          icon: 'lucide:trending-up',
          keepAlive: true,
          title: $t('commissionOrder.menu.salesCommission'),
          authority: abpPageAuthority('Admin.CommissionOrder.Get'),
          commissionType: 0,
        },
        component: () => import('#/views/commission/order-list.vue'),
      },
      {
        path: 'operation',
        name: 'CommissionOperationList',
        meta: {
          icon: 'lucide:settings-2',
          keepAlive: true,
          title: $t('commissionOrder.menu.operationCommission'),
          authority: abpPageAuthority('Admin.CommissionOrder.Get'),
          commissionType: 1,
        },
        component: () => import('#/views/commission/order-list.vue'),
      },
    ],
  },
];

export default routes;
