import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'streamline-freehand-color:security-phone-protection-approved',
      order: 210,
      title: $t('auditApproval.title'),
      hideChildrenInMenu: false,
      authority: abpPageAuthority([
        'Admin.OrderFee.Audit',
        'Admin.PaymentApplication.Audit',
        'Admin.PreOrder.Audit',
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
          keepAlive: true,
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
          keepAlive: true,
          title: $t('auditApproval.paymentReview.title'),
          activePath: '/audit-approval/payment-review',
          authority: abpPageAuthority('Admin.PaymentApplication.Audit'),
        },
        component: () =>
          import('#/views/audit-approval/payment-review/index.vue'),
      },
      {
        path: 'pre-order-review',
        name: 'PreOrderReview',
        meta: {
          icon: 'mdi:file-document-check-outline',
          keepAlive: true,
          title: '业务联系单审核',
          activePath: '/audit-approval/pre-order-review',
          authority: abpPageAuthority('Admin.PreOrder.Audit'),
        },
        component: () =>
          import('#/views/audit-approval/pre-order-review/index.vue'),
      },
      {
        path: 'expense-review/:id/expense-detail/:entityId',
        name: 'ExpenseDetail',
        props: (route) => ({
          transportOrderId: route.params.id,
          entityId: route.params.entityId,
        }),
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
