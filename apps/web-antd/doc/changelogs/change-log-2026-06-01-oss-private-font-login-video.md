# 字体与登录背景视频接入 OSS 私有签名 URL

## 背景意图

- 全局字体（阿里巴巴普惠体 6 个字重）与登录页背景视频体积较大，需迁移至阿里云 OSS 私有桶，通过后端签名 URL 临时访问。
- OSS 实际上传路径为 **bucket 根目录文件名**（如 `Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf`），与带 `assets/` 前缀的目录结构并存时需前端兼容。

## 核心逻辑变更

- 新增 `src/api/common/oss-private-file.ts`：封装 `GET /services/app/Test/GetOssUrlAsync`，并提供 `getOssPrivateFileUrlByCandidates` 按候选 Key 顺序尝试。
- 新增 `src/utils/global-font-loader.ts`：`bootstrap` 阶段并行拉取 6 个字体签名 URL，动态注入 `@font-face`；失败回退本地 `src/assets/fonts/*.ttf`。
- `src/utils/brand-assets.ts`：`initBrandPrivateAssets()` 将 `brandLoginBackVideo` 切换为 OSS 签名 URL；按品牌候选 Key（根路径优先，如 `jht-login-back.mp4`）。
- `src/bootstrap.ts`：在 `app.mount` 前执行 `initBrandPrivateAssets()` 与 `initGlobalFonts()`。
- `src/global-font.css`：移除静态 `@font-face`，仅保留 `:root` / `body` 字体栈。
- 清理未使用的 PingFang woff2 与多余 PuHuiTi 字重；登录视频本地文件重命名为 `jht-login-back.mp4` / `hhyy-login-back.mp4`。

## 避坑指南

- **objectName 必须与 OSS Key 完全一致**（含大小写）；字体优先根路径文件名，再尝试 `assets/fonts/...` 兜底。
- 签名 URL 有效期约 **10 分钟**，仅用于首屏加载；生产环境另由 Service Worker 按路径缓存 OSS 响应（见 [OSS Service Worker 缓存](./change-log-2026-06-01-oss-service-worker-cache.md)）。
- 后端对单 IP **24 小时累计 1GB** 限流；首启会并发请求 6 个字体 + 1 个视频，开发环境注意勿频繁硬刷新。
- 接口匿名可访问，但仍走 ABP `requestClient` 与统一错误提示；限流文案：`24小时内请求流量超限(1GB),请稍后再试`。
- `auth.vue` 在 `bootstrap` 之后挂载，可拿到已解析的 `brandLoginBackVideo`；若后续做路由内懒加载登录页，需确认视频变量在布局渲染前已初始化。

## OSS objectName 对照（当前实现）

| 资源 | 优先 Key（bucket 根） | 备选 Key |
| --- | --- | --- |
| 字体 Thin | `Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf` | `assets/fonts/...` |
| 登录视频 jht | `jht-login-back.mp4` | `assets/img/jht/jht-login-back.mp4` |
| 登录视频 hhyy | `hhyy-login-back.mp4` | `assets/img/hhyy/hhyy-login-back.mp4` |
| 登录视频 jiayue | `login-back.mp4` | `assets/img/jiayue/login-back.mp4` |
