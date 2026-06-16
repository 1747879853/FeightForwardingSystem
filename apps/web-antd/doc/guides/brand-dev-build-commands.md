# 多品牌开发与打包命令对照

开发与打包均通过 **Vite `--mode`** 加载对应 `.env.*`，并由 `VITE_APP_BRAND` 切换素材目录与缓存命名空间。

## 命令对照（仓库根目录）

| 公司/场景 | 开发 | 打包 | Vite mode | 素材目录 |
| --- | --- | --- | --- | --- |
| 佳越软件（本地默认） | `pnpm dev:antd` 或 `pnpm dev:antd:jiayue` | 一般不单独打包 | `development` | `src/assets/img/jiayue/` |
| 浩瀚远洋 | `pnpm dev:antd:hhyy` | `pnpm build:antd:hhyy` | `hhyy` | `src/assets/img/hhyy/` |
| 津海通 | `pnpm dev:antd:jht` | `pnpm build:antd:jht` | `jht` | `src/assets/img/jht/` |

`pnpm build:antd` 与 `pnpm build:antd:hhyy` 等价（浩瀚远洋）。

## CI / GitHub Actions

| 品牌 | Workflow | 构建命令 | 触发 |
| --- | --- | --- | --- |
| 浩瀚远洋 (hhyy) | `.github/workflows/deploy-web-antd-iis.yml` | `pnpm build:antd:hhyy` | `main` push / 手动 |
| 津海通 (jht) | `.github/workflows/deploy-web-antd-iis-jht.yml` | `pnpm build:antd:jht` | 仅手动 `workflow_dispatch` |

两路 workflow 使用**独立**的 GitHub Secrets（`IIS_*` 与 `IIS_JHT_*`），可指向同一台服务器、不同 IIS 站点。部署阶段会先把 `apps/web-antd/dist` 打成 `dist.zip`（MSDeploy package）再上传，目标 IIS 侧由 MSDeploy 自动解包同步，减少传输体积。

### GitHub Secrets（津海通 jht）

在仓库 **Settings → Secrets and variables → Actions** 配置：

| Secret | 说明 |
| --- | --- |
| `IIS_JHT_SERVER_IP` | 目标服务器 IP（未填 `IIS_JHT_MSDEPLOY_ENDPOINT` 时用于拼默认端点） |
| `IIS_JHT_MSDEPLOY_ENDPOINT` | 可选；完整 MSDeploy URL，如 `https://host:8172/msdeploy.axd?site=站点名` |
| `IIS_JHT_SITE_NAME` | IIS 站点/应用路径（与 hhyy 的 `IIS_SITE_NAME` 通常不同） |
| `IIS_JHT_USER` / `IIS_JHT_PWD` | Web Deploy 基本认证账号 |

浩瀚远洋沿用：`IIS_SERVER_IP`、`IIS_MSDEPLOY_ENDPOINT`、`IIS_SITE_NAME`、`IIS_USER`、`IIS_PWD`。

提交信息含 `[skip ci]` 时，两路部署均跳过。

## 环境文件

| 文件               | 说明                                           |
| ------------------ | ---------------------------------------------- |
| `.env.development` | 佳越软件：`VITE_APP_BRAND=jiayue`              |
| `.env.hhyy`        | 浩瀚远洋                                       |
| `.env.jht`         | 津海通                                         |
| `.env.production`  | 与 `hhyy` 保持一致（兼容旧 `production` mode） |

### 生产 API 地址（`VITE_GLOB_API_URL`）

| 品牌 | env 文件 | 当前 API |
| --- | --- | --- |
| 津海通 (jht) | `.env.jht` | `http://43.138.14.122:82/api` |
| 浩瀚远洋 (hhyy) | `.env.hhyy` / `.env.production` | `http://118.190.1.4:82/api` |

运行时生产环境通过 `dist/_app.config.js` 注入 API（`useAppConfig` → `window._VBEN_ADMIN_PRO_APP_CONF_`），**不是** `import.meta.env`。打包后可用以下命令校验：

```powershell
Get-Content dist/_app.config.js
```

### ⚠️ 打包命令与 API 加载（必读）

**必须通过 `package.json` script 打包**，不可直接调用 `pnpm vite build --mode jht`：

| 打包方式 | `_app.config.js` 实际读取的 env | jht 打包结果 |
| --- | --- | --- |
| `pnpm build:jht` / `pnpm build:antd:jht` ✅ | `.env.jht` | API = 43.138.14.122:82 |
| `pnpm vite build --mode jht` ❌ | `.env.production`（mode 解析失败回退） | API = 118.190.1.4:82 |

原因：`internal/vite-config` 生成 `_app.config.js` 时，`getConfFiles()` 从 `npm_lifecycle_script` 解析 `--mode`，绕过 npm script 直接调 vite 时解析失败，回退到 `production`。

详见 [解析日志：jht 打包 API 地址误用 production 环境](../parsing-logs/parse-log-2026-06-16-jht-build-mode-api-url-mismatch.md)。

## 缓存隔离

各品牌 `VITE_APP_NAMESPACE` 不同（如 `vben-web-antd-hhyy`），Pinia、偏好设置及业务 localStorage 均不会串库。切换品牌后若界面异常，可清空当前站点 localStorage。

## OSS 私有品牌素材（字体 / 登录视频）

大体积资源已迁移阿里云 OSS 私有桶，前端通过匿名接口 `GET /services/app/Test/GetOssUrlAsync?objectName=<Key>` 获取 **10 分钟** 有效签名 URL。

| 品牌 | 登录背景视频 OSS Key（优先） | 本地兜底文件 |
| --- | --- | --- |
| jht | `jht-login-back.mp4` | `src/assets/img/jht/jht-login-back.mp4` |
| hhyy | `hhyy-login-back.mp4` | `src/assets/img/hhyy/hhyy-login-back.mp4` |
| jiayue | `login-back.mp4` | `src/assets/img/jiayue/login-back.mp4` |

全局字体 6 个字重同理，Key 为根路径文件名（如 `Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf`）。上传时请保持与代码中 `objectNames` 一致。

初始化入口：`bootstrap` → `initBrandPrivateAssets()` + `initGlobalFonts()`。详见 [变更日志](../changelogs/change-log-2026-06-01-oss-private-font-login-video.md)。

### Service Worker 缓存

- `pnpm dev:hhyy`、`pnpm dev:jht`、`pnpm build:hhyy`、`pnpm build:jht` 均会注册 `public/service-worker.js`。
- 仅缓存 `aliyuncs.com` 的 `GET` 资源；缓存 Key = `origin + pathname`（去掉签名参数）。
- 更新 OSS 文件后：改 SW 内 `CACHE_VERSION` 并重新部署，或更换 objectName。
- 详见 [OSS Service Worker 缓存变更日志](../changelogs/change-log-2026-06-01-oss-service-worker-cache.md)。

## 变更与解析日志

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-06-16 | `Parsing` | 无 | 解析直接执行 `pnpm vite build --mode jht` 导致 `_app.config.js` 误读 `.env.production`、API 指向 118.190.1.4:82 的根因；明确必须通过 `pnpm build:jht` 打包。 |
