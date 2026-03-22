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
        name: 'ExpenseReview',
        meta: {
          icon: 'mdi:receipt-text-check',
          title: $t('auditApproval.expenseReview.title'),
        },
        children: [
          {
            path: 'all',
            name: 'ExpenseAll',
            meta: {
              icon: 'mdi:file-upload-outline',
              title: $t('auditApproval.expenseReview.all'),
              activePath: '/audit-approval/expense-review',
            },
            component: () =>
              import('#/views/audit-approval/expense-all/list.vue'),
          },
          {
            path: ':id/expense-detail/:entityId',
            name: 'SeaExportDetail',
            meta: {
              title: $t('auditApproval.expenseReview.detail'),
              hideInMenu: true,
              activePath: '/audit-approval/expense-review',
            },
            component: () =>
              import('#/views/audit-approval/expense-all/modules/detail.vue'),
          },
          {
            path: 'submission',
            name: 'ExpenseSubmission',
            meta: {
              icon: 'mdi:file-upload-outline',
              title: $t('auditApproval.expenseSubmission.title'),
              activePath: '/audit-approval/expense-review',
            },
            component: () =>
              import('#/views/audit-approval/expense-submission/list.vue'),
          },
          {
            path: ':id/expense-submission-detail/:entityId',
            name: 'SeaExportDetail',
            meta: {
              title: $t('auditApproval.expenseSubmission.detail'),
              hideInMenu: true,
              activePath: '/audit-approval/expense-review',
            },
            component: () =>
              import('#/views/audit-approval/expense-submission/modules/detail.vue'),
          },
        ],
      },
    ],
  },
];

export default routes;
