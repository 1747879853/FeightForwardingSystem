import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:file-document-check-outline',
      order: 202,
      title: $t('auditApproval.title'),
      hideChildrenInMenu: false,
      authority: abpPageAuthority([
        'Admin.OrderFee.Audit',
        'Admin.PaymentApplication.Audit',
      ]),
    },
    name: 'AuditApproval',
    path: '/audit-approval',
    children: [
      {
        path: 'expense-review',
        name: 'ExpenseAll',
        meta: {
          icon: 'mdi:file-upload-outline',
          title: $t('auditApproval.expenseReview.all'),
          activePath: '/audit-approval/expense-review',
          authority: abpPageAuthority('Admin.OrderFee.Audit'),
        },
        component: () => import('#/views/audit-approval/expense-all/index.vue'),
      },
      {
        path: 'payment-review',
        name: 'PaymentReview',
        meta: {
          icon: 'mdi:cash-check',
          title: $t('auditApproval.paymentReview.title'),
          activePath: '/audit-approval/payment-review',
          authority: abpPageAuthority('Admin.PaymentApplication.Audit'),
        },
        component: () =>
          import('#/views/audit-approval/payment-review/index.vue'),
      },
      {
        path: 'expense-review/:id/expense-detail/:entityId',
        name: 'ExpenseDetail',
        meta: {
          title: $t('auditApproval.expenseReview.detail'),
          hideInMenu: true,
          activePath: '/audit-approval/expense-review',
          authority: abpPageAuthority('Admin.OrderFee.Audit'),
        },
        component: () =>
          import('#/views/audit-approval/expense-all/modules/detail.vue'),
      },
    ],
  },
];

export default routes;
