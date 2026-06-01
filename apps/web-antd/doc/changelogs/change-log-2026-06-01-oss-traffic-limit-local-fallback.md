# OSS 签名接口限流静默降级本地资源

## 背景意图

- `GetOssUrlAsync` 对单 IP 有 24 小时 1GB 流量上限，超限后返回 **500 Internal Server Error**。
- 原实现使用 `requestClient`，会触发全局 `message.error` 弹窗，影响首屏体验。
- 超限后应直接回退本地字体/登录视频，且不再继续尝试 OSS 候选 Key。

## 核心逻辑变更

- `src/api/common/oss-private-file.ts`：
  - 改用 `baseRequestClient` 静默请求，不经过全局错误提示拦截器。
  - 新增 `isOssTrafficLimitError()`：识别 `500` 且消息含 `24小时内请求流量超限`。
  - `getOssPrivateFileUrlByCandidates()` 命中限流后立即 `throw`，停止后续 objectName 重试。
- 上层已有兜底（无需改动调用方）：
  - `global-font-loader.ts`：`catch` 后使用本地 TTF。
  - `brand-assets.ts`：`initBrandPrivateAssets()` 回退本地 `login-back` 视频。

## 避坑指南

- 限流判断依赖后端错误文案关键字，若后端调整提示语需同步更新 `isOssTrafficLimitError`。
- 静默通道仅用于 OSS 签名 URL 获取，业务接口仍使用 `requestClient`。
- 本地兜底资源须保留在构建产物中，否则限流后可能出现字体/视频缺失。
