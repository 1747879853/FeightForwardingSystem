# 龙山登录页背景视频增加压暗蒙层

## 背景意图

龙山品牌登录页背景视频（`longshan.mp4`）画面偏亮，影响表单可读性与视觉层次，需在视频上方增加半透明压暗蒙层。

## 核心逻辑变更

- `AuthPageLayout` 新增可选 prop：`loginBackgroundDimmed`
- 启用时为已有 `.login-background-mask` 增加 `--dimmed` 样式（初值 `48%`，后续已调亮为 `24%`，见同日调亮变更）
- `apps/web-antd/src/layouts/auth.vue` 仅在 `isLongshanBrand` 时传入 `true`，其他品牌不受影响

## 避坑指南

- 蒙层仅依赖 `VITE_APP_BRAND=longshan`，需用 `pnpm build:longshan` / `pnpm dev:longshan` 验证
- 若仍偏亮或过暗，只调 `authentication.vue` 中 `.login-background-mask--dimmed` 的透明度即可
