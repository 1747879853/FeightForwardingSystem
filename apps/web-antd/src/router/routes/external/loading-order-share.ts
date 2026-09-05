import type { RouteRecordRaw } from 'vue-router';

/**
 * 监装工单客户公开详情（免登录、无 Layout）。
 * 口令是主提单号 + 监装工单号：`/loading-order-share?mblNum=&loadingOrderNum=`
 * 页内不展示监装要求与备注。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'LoadingOrderSharePage',
    path: '/loading-order-share',
    component: () => import('#/views/loading-order-share/page.vue'),
    meta: {
      title: '监装信息',
      ignoreAccess: true,
      hideInMenu: true,
      hideInTab: true,
      hideInBreadcrumb: true,
    },
  },
];

export default routes;
