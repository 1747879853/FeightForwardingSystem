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
        'Admin.OrderFee.Audit',
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
          title: $t('seaExport.export.feeLock.list'),
          authority: abpPageAuthority('Admin.OrderFee.Lock'),
        },
        component: () =>
          import('#/views/fee-management/fee-lock/fee-lock-list.vue'),
      },
      {
        path: 'expense-review',
        name: 'ExpenseAll',
        meta: {
          icon: 'mdi:file-upload-outline',
          title: $t('auditApproval.expenseReview.all'),
          activePath: '/fee-management/expense-review',
          authority: abpPageAuthority('Admin.OrderFee.Audit'),
        },
        component: () => import('#/views/audit-approval/expense-all/index.vue'),
      },
      {
        path: 'expense-review/:id/expense-detail/:entityId',
        name: 'ExpenseDetail',
        meta: {
          title: $t('auditApproval.expenseReview.detail'),
          hideInMenu: true,
          activePath: '/fee-management/expense-review',
          authority: abpPageAuthority('Admin.OrderFee.Audit'),
        },
        component: () =>
          import('#/views/audit-approval/expense-all/modules/detail.vue'),
      },
    ],
  },
];

export default routes;
