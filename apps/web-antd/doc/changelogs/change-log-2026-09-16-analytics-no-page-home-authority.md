# 分析首页不再按 Page.Home 拦截

## 背景意图

默认首页 `/analytics` 曾绑定 `Page.Home` / `Page.Home.Get`。未授权该码的登录用户进不了首页。首页只要求已登录即可进入，不再用页面权限控制。

## 核心逻辑变更

- `dashboard.ts` 中 `Analytics` 路由去掉 `meta.authority`。
- 工作台 `/workspace` 仍走 `Admin.Workbench`，本次未改。
- 浩瀚远洋默认首页 `/dashboard/sea-freight-globe` 本来就没有页面权限，保持不变。

## 避坑指南

- 侧栏是否显示分析页仍受动态菜单与其它路由 meta 影响；本次只放开进入 `/analytics` 的权限码校验。
- 后端角色里即使没有 `Page.Home`，登录后仍应能打开分析首页。
