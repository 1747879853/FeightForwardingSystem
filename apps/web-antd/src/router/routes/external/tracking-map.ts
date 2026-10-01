import type { RouteRecordRaw } from 'vue-router';

/**
 * 货物轨迹独立静态页（免登录、无 Layout、可分享给外部客户）。
 * - iframe 内嵌轨迹地图，地址与企业编号收敛在 env，不对外暴露
 * - 页头按主提单号取所属公司 Logo，没有则用品牌图
 * - 订阅号通过 URL 传入：/tracking-map/:mblNo
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'TrackingMapPage',
    path: '/tracking-map/:mblNo?',
    component: () => import('#/views/tracking-map/page.vue'),
    meta: {
      title: '货物轨迹',
      ignoreAccess: true,
      hideInMenu: true,
      hideInTab: true,
      hideInBreadcrumb: true,
    },
  },
];

export default routes;
