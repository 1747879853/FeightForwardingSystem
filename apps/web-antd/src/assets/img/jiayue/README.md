# 佳越软件（jiayue）— 本地开发默认品牌

`pnpm dev` / `pnpm dev:antd`（`--mode development`）使用本目录，对应 `.env.development` 中 `VITE_APP_BRAND=jiayue`、`VITE_APP_TITLE=佳越软件`。

| 文件              | 用途                                  |
| ----------------- | ------------------------------------- |
| `logo.webp`       | 侧栏 / 系统偏好 Logo（Vben 中性图标） |
| `logo-text.webp`  | 首屏 Loading、路由切换 Loading        |
| `logo-login.webp` | 登录页 `auth-title-logo`（宽 72px）   |
| `login-back.mp4`  | 登录页背景视频                        |

素材来源：`@vbenjs/static-source` 的 `logo-v1.webp`。客户正式环境请使用 `pnpm dev:antd:hhyy` 或 `pnpm dev:antd:jht`。
