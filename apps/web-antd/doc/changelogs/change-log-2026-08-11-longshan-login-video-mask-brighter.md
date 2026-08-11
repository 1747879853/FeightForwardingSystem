# 龙山登录页视频蒙层调亮

## 背景意图

龙山登录页背景视频压暗蒙层（此前 `48%`）过暗，视频细节被压没，需轻微提亮同时保留表单可读性。

## 核心逻辑变更

- `.login-background-mask--dimmed` 透明度由 `rgb(3 10 24 / 48%)` 调整为 `rgb(3 10 24 / 24%)`
- 仅影响 `loginBackgroundDimmed` 开启时（龙山品牌），其他品牌无蒙层不变

## 避坑指南

- 若仍偏暗/偏亮，只改 `packages/effects/layouts/src/authentication/authentication.vue` 中该 rgba 透明度
- 需用 `pnpm dev:longshan` / `pnpm build:antd:longshan` 验证
