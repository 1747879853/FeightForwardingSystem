import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:file-check-outline',
      order: 100,
      title: $t('auditApproval.title'),
    },
    name: 'AuditApproval',
    path: '/audit-approval',

    children: [
      {
        path: '/audit-approval/expense-review',
        name: 'ExpenseAll',
        meta: {
          icon: 'mdi:file-upload-outline',
          title: $t('auditApproval.expenseReview.all'),
          activePath: '/audit-approval/expense-review',
        },
        component: () => import('#/views/audit-approval/expense-all/index.vue'),
      },
      {
        path: '/audit-approval/expense-review/:id/expense-detail/:entityId',
        name: 'ExpenseDetail',
        meta: {
          title: $t('auditApproval.expenseReview.detail'),
          hideInMenu: true,
          activePath: '/audit-approval/expense-review',
        },
        component: () =>
          import('#/views/audit-approval/expense-all/modules/detail.vue'),
      },
    ],
  },
];

export default routes;
