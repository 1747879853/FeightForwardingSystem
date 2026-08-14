# 海运 3D 地球看板仅 hhyy 打包可见

## 背景意图

`/dashboard/sea-freight-globe` 为浩瀚远洋专题看板，不应出现在 jht / sjtd / jiayue / longshan 等其他品牌菜单与默认首页中。

## 核心逻辑变更

- `dashboard.ts`：仅当 `VITE_APP_BRAND=hhyy`（`isHhyyBrand`）时注册 `Dashboard` / `SeaFreightGlobe` 路由。
- `preferences.ts`：hhyy 默认首页仍为 `/dashboard/sea-freight-globe`，其他品牌为 `/analytics`。
- `user.ts`：登录后 `homePath` 与上述规则一致。
- `@core/preferences` 共享默认首页恢复为 `/analytics`，避免非 web-antd 应用误指向不存在路由。

## 避坑指南

1. 切换品牌后若仍跳转地球页，清空站点 localStorage（偏好缓存可能残留旧 `defaultHomePath`）。
2. 验证需用对应 mode：`pnpm dev:antd:hhyy` 可见菜单；`pnpm dev:antd:jht` 等不应出现该路由。
