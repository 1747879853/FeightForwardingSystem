import type { RouteRecordRaw } from 'vue-router';

/**
 * 货物轨迹独立静态页（免登录、无 Layout、可分享给外部客户）。
 * - iframe 内嵌轨迹地图，地址与企业编号收敛在 env，不对外暴露
 * - 页头品牌 logo 随打包品牌 VITE_APP_BRAND 自动切换
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
