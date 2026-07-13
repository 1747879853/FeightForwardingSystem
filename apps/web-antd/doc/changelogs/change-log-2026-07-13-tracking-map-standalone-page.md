# 2026-07-13 货物轨迹独立静态页（免登录 + 品牌 logo + iframe 内嵌）

## 背景意图

在已有「全局货物轨迹弹窗」基础上，业务需要一个可直接分享给外部客户的**独立静态页**：通过链接带订阅号即可查看货物轨迹，无需登录、无系统侧边栏/顶栏；页头展示当前品牌公司 logo（白标），且不对外暴露 trackingeyes 原始地址与企业编号。

## 核心逻辑变更

- **抽取共享拼装函数** `components/tracking-map/build-tracking-map-src.ts`：
  - `buildTrackingMapSrc(referenceNo)` 统一构建 iframe 地址，地址与企业编号读 env（`VITE_GLOB_TRACKING_MAP_URL` / `VITE_GLOB_TRACKING_COMPANY_ID`），用 `URLSearchParams` 兼容 `#/Map` hash，缺任一要素返回空串。
  - `tracking-map-modal.vue` 改为复用此函数（去掉重复拼装逻辑），`index.ts` 追加导出。
- **新增静态页** `views/tracking-map/page.vue`：
  - 全屏布局：顶部 header（品牌 logo + 「货物轨迹查询」）+ 主体全屏 iframe。
  - 品牌 logo 用 `#/utils/brand-assets` 的 `brandLogoText`（回退 `brandLogo`），随打包品牌 `VITE_APP_BRAND` 自动切换；公司名回退取 `VITE_APP_TITLE`。
  - 订阅号从路由读取（`params.mblNo`，兼容 `query.mblNo`）；无订阅号时展示 `Empty` 空态。
- **启用 external 路由**（`router/routes/index.ts`）：取消 `./external/**/*.ts` glob 注释，纳入初始 `routes`（不经 BasicLayout，天然全屏）。
- **新增路由** `router/routes/external/tracking-map.ts`：`path: /tracking-map/:mblNo?`，meta `ignoreAccess: true`（免登录）+ `hideInMenu/hideInTab/hideInBreadcrumb`。

## 验证结论（dev 5010，jiayue 品牌）

- `/tracking-map/TEST123456`：免登录直达，页头显示佳越 logo 与「货物轨迹查询」，iframe src = `.../#/Map?companyid=100514&referenceno=TEST123456`，trackingeyes 正常内嵌（假号显示无数据，符合预期）。
- `/tracking-map`（无参）：无 iframe，展示「暂无可查询的订阅号」空态。

## 避坑指南

- **免登录靠 `ignoreAccess: true`**：external 路由在初始 routes 里注册，但仍走全局守卫；未登录访问必须靠该 meta 放行，漏配会被重定向到登录页。
- **external glob 需手动开启**：`routes/index.ts` 默认注释了 external glob，新增此类页面务必取消注释，否则路由不生效。
- **企业编号/地址不硬编码**：页面与 `buildTrackingMapSrc` 均不出现 `100514` 与原始域名，全部读 env；不同品牌企业编号不同的话在对应 `.env.<brand>` 覆盖 `VITE_GLOB_TRACKING_COMPANY_ID`。
- **前端暴露边界**：iframe src 最终在 DOM/DevTools 可见，属纯前端固有限制；本方案目标是代码/页面层面不散落、集中可维护，非网络层隐藏。
