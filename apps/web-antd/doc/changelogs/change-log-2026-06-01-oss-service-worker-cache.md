# OSS 静态资源 Service Worker 缓存（忽略签名参数）

## 背景意图

- OSS 私有资源通过 `GetOssUrlAsync` 返回的 URL 带 `OSSAccessKeyId`、`Expires`、`Signature` 等查询参数，约 10 分钟失效。
- 同一文件路径每次签名不同会导致浏览器无法复用 HTTP 缓存，重复下载字体等大文件。
- 需对 `aliyuncs.com` 请求做 Cache Storage 缓存，Key 使用 `origin + pathname`；开发与生产均注册 SW。

## 核心逻辑变更

- 新增 `public/service-worker.js`：
  - 仅拦截 `GET` 且 `hostname` 含 `aliyuncs.com`（可扩展 `your-cdn.com`）的请求。
  - 缓存键：`origin + pathname`，忽略签名查询串。
  - 策略：Cache First（命中直接返回，未命中拉网络后 `cache.put`）。
  - `activate` 时清理旧版本 `oss-static-resources-*` 桶。
  - 带 `Range` 头的请求不缓存（避免 206 分片响应写入缓存）。
- 新增 `src/utils/register-oss-cache-sw.ts`：在 `window.load` 后注册 `/service-worker.js`（开发/生产均启用）。
- `src/main.ts`：应用启动前调用 `registerOssCacheServiceWorker()`。

## 部署与环境

| 场景                                       | SW 是否注册 |
| ------------------------------------------ | ----------- |
| `pnpm build:hhyy` / `build:jht` 部署后访问 | 是          |
| `pnpm dev:hhyy` / `dev:jht` / `dev:jiayue` | 是          |

两套品牌共用同一 SW 脚本；Cache Storage 按**站点 origin**（含 `localhost:5010` 等）隔离，与 `VITE_APP_NAMESPACE` 无关。

## 缓存命中表现与排查

- **无内置 console 日志**；通过 DevTools 观察：
  - **Application → Service Workers**：是否 controlling。
  - **Application → Cache Storage → `oss-static-resources-v1`**：条目 Key 为无查询参数的完整路径 URL。
  - **Network**：二次请求 Size 常显示 `(ServiceWorker)`，不再访问 OSS 外网。
- 首次访问某路径：miss → 网络拉取 → 写入缓存。
- 再次访问（签名 URL 已变）：仍 hit 同一路径 Key。

## 资源更新方式

| 方式 | 操作 |
| --- | --- |
| 推荐 | 修改 `service-worker.js` 中 `CACHE_VERSION`（如 `v1` → `v2`），重新打包部署；`activate` 自动删旧桶 |
| 备选 | OSS 上更换 objectName（新路径 = 新缓存 Key） |
| 调试 | DevTools → Application → 删除 `oss-static-resources-v1` 或 Clear storage |

## 避坑指南

- 仅缓存 OSS 域名请求，**不影响** `/api` 等业务接口。
- 登录视频若浏览器长期发 `Range` 分片请求，可能不走 SW 缓存；字体整文件 GET 收益最明显。
- 更新 OSS 文件内容但路径不变时，必须 bump `CACHE_VERSION`，否则用户会继续读到旧缓存。
