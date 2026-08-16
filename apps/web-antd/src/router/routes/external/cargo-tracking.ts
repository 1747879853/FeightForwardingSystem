import type { RouteRecordRaw } from 'vue-router';

/**
 * 新服务商轨迹地图独立静态页（免登录、无 Layout、可分享给外部客户）。
 * - 空运：`/cargo-tracking/air?no=<航司单号>&lang=en`，地址由前端按 env 拼装
 * - 海运：`/cargo-tracking/ocean?t=<令牌>&lang=en`，令牌为编码后的轨迹链接
 * - 页头只出现本系统品牌与中性标题，不暴露服务商信息
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'CargoTrackingPage',
    path: '/cargo-tracking/:kind(air|ocean)',
    component: () => import('#/views/tracking-map/vendor-page.vue'),
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
