# 登录背景视频与全局字体改为固定 OSS 地址并禁用 SW

## 背景意图

- 登录背景视频与阿里巴巴普惠体字体资源体积较大，继续保留本地文件会显著增加前端构建产物体积。
- 现网已提供可直连的固定 OSS 地址，不再需要通过后端接口换取临时签名地址。
- 线上排查确认字体跨域异常与浏览器 Service Worker 拦截链路相关，需停用 SW 并清理历史缓存。

## 核心逻辑变更

- `src/utils/brand-assets.ts`
  - 登录背景视频改为品牌固定 OSS 地址（`jht`/`hhyy`/`jiayue`）。
  - 移除本地视频 import 与本地回退逻辑。
- `src/utils/global-font-loader.ts`
  - 非 `jht` 品牌直接使用固定 OSS 字体地址。
  - `jht` 保持“优先签名 URL，失败回退固定 OSS 地址”。
  - 移除本地字体 import 与本地字体兜底依赖。
- `src/utils/register-oss-cache-sw.ts`
  - 停止注册 Service Worker。
  - 页面加载后主动注销已注册 SW，并清理 `oss-static-resources*` 历史缓存。
- `public/service-worker.js`
  - 补充 `oss.jiayuebetter.com` 域名匹配。
  - 字体请求不走 SW 缓存（`request.destination === 'font'`）。
- 删除本地大资源，避免进入构建产物：
  - `src/assets/fonts/*.ttf`（6 个字重）
  - `src/assets/img/*/*login-back.mp4`（3 个品牌登录视频）

## 避坑指南

- 固定 OSS 地址必须与实际 object key 完全一致（大小写、路径都要一致）。
- 字体若仍出现 CORS 错误，优先核对浏览器实际请求 URL 是否与预期一致，再排查重定向链每一跳响应头。
- SW 已改为禁用策略，发布后建议执行一次强刷或清站点数据，确保旧 SW 与旧缓存完全失效。
