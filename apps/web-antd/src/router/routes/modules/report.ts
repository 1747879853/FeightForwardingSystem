import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:bar-chart-3',
      order: 300,
      title: '报表',
    },
    name: 'Report',
    path: '/report',
    children: [
      {
        path: 'profit-report',
        name: 'ProfitReport',
        meta: {
          keepAlive: true,
          title: '利润报表',
          authority: abpPageAuthority('Admin.Report.Profit.Get'),
        },
        component: () => import('#/views/report/profit-report/index.vue'),
      },
      {
        path: 'arrears-report',
        name: 'ArrearsReport',
        meta: {
          keepAlive: true,
          title: '欠费报表',
          // authority: abpPageAuthority('Admin.Report.Arrears.Get'),
        },
        component: () => import('#/views/report/arrears-report/index.vue'),
      },
    ],
  },
];

export default routes;
