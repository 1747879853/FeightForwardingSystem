# 多品牌开发与打包命令对照

开发与打包均通过 **Vite `--mode`** 加载对应 `.env.*`，并由 `VITE_APP_BRAND` 切换素材目录与缓存命名空间。

## 命令对照（仓库根目录）

| 公司/场景 | 开发 | 打包 | Vite mode | 素材目录 |
| --- | --- | --- | --- | --- |
| 佳越测试（:88） | `pnpm dev:antd` / `pnpm dev:antd:jytest` | `pnpm build:antd:jytest` | `development` / `jytest` | `src/assets/img/jiayue/`（复用佳越素材） |
| 佳越标准库（:85，禁止测试） | `pnpm dev:antd:jiayue` | `pnpm build:antd:jiayue` | `jiayue` | `src/assets/img/jiayue/` |
| 浩瀚远洋 | `pnpm dev:antd:hhyy` | `pnpm build:antd:hhyy` | `hhyy` | `src/assets/img/hhyy/` |
| 津海通 | `pnpm dev:antd:jht` | `pnpm build:antd:jht` | `jht` | `src/assets/img/jht/` |
| 世纪通达 | `pnpm dev:antd:sjtd` | `pnpm build:antd:sjtd` | `sjtd` | `src/assets/img/sjtd/` |
| 龙山 | `pnpm dev:antd:longshan` | `pnpm build:antd:longshan` | `longshan` | `src/assets/img/longshan/` |
| 演示环境 | `pnpm dev:antd:demo` | `pnpm build:antd:demo` | `demo` | `src/assets/img/jiayue/`（复用佳越素材） |

`pnpm build:antd` 与 `pnpm build:antd:hhyy` 等价（浩瀚远洋）。

## CI / GitHub Actions

| 品牌 | Workflow | 构建命令 | 触发 |
| --- | --- | --- | --- |
| 浩瀚远洋 (hhyy) | `.github/workflows/deploy-web-antd-iis.yml` | `pnpm build:antd:hhyy` | 仅手动 `workflow_dispatch` |
| 津海通 (jht) | `.github/workflows/deploy-web-antd-iis-jht.yml` | `pnpm build:antd:jht` | 仅手动 `workflow_dispatch` |

两路 workflow 使用**独立**的 GitHub Secrets（`IIS_*` 与 `IIS_JHT_*`）。浩瀚远洋发布到独立业务机 `47.105.61.173`，津海通仍在 `43.138.14.122`，不要共用 `IIS_SERVER_IP`。部署阶段会先把 `apps/web-antd/dist` 打成 `dist.zip`（MSDeploy package）再上传，目标 IIS 侧由 MSDeploy 自动解包同步，减少传输体积。

### GitHub Secrets（津海通 jht）

在仓库 **Settings → Secrets and variables → Actions** 配置：

| Secret | 说明 |
| --- | --- |
| `IIS_JHT_SERVER_IP` | 目标服务器 IP（未填 `IIS_JHT_MSDEPLOY_ENDPOINT` 时用于拼默认端点） |
| `IIS_JHT_MSDEPLOY_ENDPOINT` | 可选；完整 MSDeploy URL，如 `https://host:8172/msdeploy.axd?site=站点名` |
| `IIS_JHT_SITE_NAME` | IIS 站点/应用路径（与 hhyy 的 `IIS_SITE_NAME` 通常不同） |
| `IIS_JHT_USER` / `IIS_JHT_PWD` | Web Deploy 基本认证账号 |

浩瀚远洋沿用：`IIS_SERVER_IP`（`47.105.61.173`）、`IIS_MSDEPLOY_ENDPOINT`、`IIS_SITE_NAME`（`hhyy-web`）、`IIS_USER`（`IISUSER`）、`IIS_PWD`。迁机后须在 GitHub Secrets 改 `IIS_SERVER_IP`（以及若有硬编码旧机的 `IIS_MSDEPLOY_ENDPOINT`）。

hhyy / jht 均不再随 `main` push 自动发布。日常用本地 `pnpm deploy:antd:hhyy`；GitHub 上仍可手动跑对应 workflow。

### 本地打包并发布（publish-web）

Windows 本机安装 MSDeploy 3.x 后，在 `scripts\publish-config.local.json`（Git 忽略）填写各品牌 IIS 参数，然后：

```powershell
pnpm deploy:antd:hhyy
pnpm deploy:antd:jht
pnpm deploy:antd:jiayue
pnpm deploy:antd:jytest
pnpm deploy:antd:sjtd
pnpm deploy:antd:longshan
pnpm deploy:antd:demo
```

浩瀚远洋目标：独立业务机 `47.105.61.173`，站点 `hhyy-web`，用户 `IISUSER`；密码只写本地 `publish-config.local.json` 或环境变量 `IIS_HHYY_PWD`（优先于配置文件），禁止提交进仓库。

佳越测试目标：服务器 `43.138.14.122`，IIS 站点 **`jiayue-web-test`**；`pnpm deploy:antd:jytest` 发到该站点，接口仍是 `:88`。

龙山目标（与 `龙山.pubxml` 一致）：服务器 `175.178.101.30`，站点 `longshan-web`；密码也可设环境变量 `IIS_LONGSHAN_PWD`（优先于配置文件）。

常用参数：

| 参数 | 说明 |
| --- | --- |
| `-InstallDeps` | 构建前执行 `pnpm install --frozen-lockfile` |
| `-SkipBuild` | 跳过构建，重新打包并发布现有 `dist-<环境>` |
| `-WhatIfOnly` | 只执行 MSDeploy 发布预览，不修改服务器 |
| `-SkipConnectivityCheck` | 跳过 8172 端口检查 |
| `-Force` | 跳过正式发布前输入环境名的二次确认，适合受控自动化 |

示例：只预览已有产物：

```powershell
.\scripts\publish-web.ps1 -Environment longshan -SkipBuild -WhatIfOnly
```

脚本会校验 `dist-<环境>/_app.config.js` 中的 API 与对应 `.env.<环境>` 一致，避免错发品牌产物；发布时继续保留服务器上的站点验证文件、`logs` 和 `data` 目录。详见 `scripts/本地打包发布说明.md`。

`pnpm deploy:antd:all` 会先共享 prebuild，再按品牌并行构建到 `apps/web-antd/dist-<品牌>` 并同时 MSDeploy，包含浩瀚远洋（站点 `hhyy-web`）。GitHub 的 hhyy workflow 仅手动触发，产物仍写默认 `dist`。机器吃紧时可 `.\scripts\publish-all-web.ps1 -ThrottleLimit 2`。

## 环境文件

| 文件               | 说明                                                |
| ------------------ | --------------------------------------------------- |
| `.env.development` | 佳越测试（本地默认，:88）：`VITE_APP_BRAND=jiayue`  |
| `.env.jytest`      | 佳越测试（:88 可打包）：`VITE_APP_BRAND=jiayue`     |
| `.env.jiayue`      | 佳越标准库-禁止测试（:85）：`VITE_APP_BRAND=jiayue` |
| `.env.hhyy`        | 浩瀚远洋                                            |
| `.env.jht`         | 津海通                                              |
| `.env.sjtd`        | 世纪通达                                            |
| `.env.longshan`    | 龙山                                                |
| `.env.demo`        | 演示环境（`VITE_APP_BRAND=jiayue`，复用佳越素材）   |
| `.env.production`  | 与 `hhyy` 保持一致（兼容旧 `production` mode）      |

### 生产 API 地址（`VITE_GLOB_API_URL`）

| 品牌 | env 文件 | 当前 API |
| --- | --- | --- |
| 津海通 (jht) | `.env.jht` | `http://43.138.14.122:82/api` |
| 浩瀚远洋 (hhyy) | `.env.hhyy` / `.env.production` | `http://47.105.61.173:84/api` |
| 世纪通达 (sjtd) | `.env.sjtd` | `http://43.138.14.122:84/api` |
| 佳越测试 (jytest) | `.env.jytest` | `http://43.138.14.122:88/api` |
| 佳越标准库 (jiayue) | `.env.jiayue` | `http://43.138.14.122:85/api` |
| 龙山 (longshan) | `.env.longshan` | `http://175.178.101.30:86/api` |
| 演示环境 (demo) | `.env.demo` | `http://43.138.14.122:86/api` |

运行时生产环境通过 `dist/_app.config.js` 注入 API（`useAppConfig` → `window._VBEN_ADMIN_PRO_APP_CONF_`），**不是** `import.meta.env`。打包后可用以下命令校验：

```powershell
Get-Content dist/_app.config.js
```

### ⚠️ 打包命令与 API 加载（必读）

**必须通过 `package.json` script 打包**，不可直接调用 `pnpm vite build --mode jht`：

| 打包方式 | `_app.config.js` 实际读取的 env | jht 打包结果 |
| --- | --- | --- |
| `pnpm build:jht` / `pnpm build:antd:jht` ✅ | `.env.jht` | API = 43.138.14.122:82 |
| `pnpm vite build --mode jht` ❌ | `.env.production`（mode 解析失败回退） | API = 47.105.61.173:84 |

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
| jiayue / jytest / demo | `jht-login-back.mp4`（与 jht 共用；原 `login-back.mp4` 已从 OSS 下线） | — |
| longshan | `longshan.mp4` | — |

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
| 2026-08-26 | `Chore` | 浩瀚远洋 IIS / WebDeploy 目标改为独立机 `47.105.61.173`，站点 `hhyy-web`，用户 `IISUSER` | 本地 `publish-config.local.json` 与 example 模板同步；GitHub Secret `IIS_SERVER_IP` 须手工改到新机；密码不入库 |
| 2026-08-26 | `Feature` | 新增佳越测试环境（jytest），后端 43.138.14.122:88，站点标题「佳越测试」，Logo 复用佳越；IIS 站点 `jiayue-web-test` | 新增 `.env.jytest`，`VITE_APP_BRAND=jiayue`；本地 `pnpm dev:antd` 标题同步为「佳越测试」；独立 `VITE_APP_NAMESPACE=vben-web-antd-jytest`；favicon 同步增加 `logo.webp` 候选 |
| 2026-08-26 | `Chore` | 浩瀚远洋生产接口改为 `http://47.105.61.173:84/api` | `.env.hhyy` / `.env.production` 与 `dev:hhyy` 代理同步；勿与世纪通达同端口 `:84`（`43.138.14.122`）混淆；须重新 `build:hhyy` 后再发布 |
| 2026-08-25 | `Chore` | 佳越 `:85` 站点标题改为「佳越标准库-禁止测试」 | 仅改 `.env.jiayue` 的 `VITE_APP_TITLE`；须重新 `build:antd:jiayue` 后浏览器标签/登录页才生效 |
| 2026-08-25 | `Chore` | 浩瀚远洋 GitHub Actions 取消 `main` push 自动发布，仅保留手动 | 与 jht 一致；日常发布走 `pnpm deploy:antd:hhyy` |
| 2026-08-25 | `Chore` | 本地默认开发与小程序开发接口改到 `http://43.138.14.122:88`，停用 `118.190.1.4:82` | `.env.development` 静态根、`vite.config.mts` 默认代理、`apps/mp` 的 `VITE_API_ORIGIN` 同步 |
| 2026-08-25 | `Feature` | 浩瀚远洋接入本地 `publish-web.ps1` / `deploy:antd:hhyy` / `deploy:antd:all`，IIS 站点 `hhyy-web` | 本地产物走 `dist-hhyy`；须关 `VITE_ARCHIVER`，否则会压硬编码 `dist.zip` 导致 pnpm 退出 1；GitHub 仍写默认 `dist` |
| 2026-08-25 | `Chore` | 浩瀚远洋生产接口改为金海通同机 `http://43.138.14.122:88/api` | `.env.hhyy` / `.env.production` 与 `dev:hhyy` 代理同步；须重新 `build:hhyy` 后再发布 |
| 2026-08-24 | `Revert` | 撤回津海通 HTTPS 域名，生产接口改回 `http://43.138.14.122:82/api` | `.env.jht` 与 `vite.config.mts` 代理同步回滚；须重新 `build:jht` 后再发布 |
| 2026-08-24 | `Fix` | 津海通生产接口改为 `https://api.jinhaitone.com/api` | 该改动已撤回，见上一行 |
| 2026-08-17 | `Feature` | 本地全量发布改为按品牌独立 `dist-<品牌>` 并行打包与 MSDeploy；hhyy 仍走 GitHub Actions | `publish-all-web.ps1` 共享 prebuild 后按 `-ThrottleLimit` 并行；`--outDir` 才隔离 public，未传参时默认 `dist` 不变 |
| 2026-08-17 | `Feature` | 龙山接入 `publish-web.ps1` / `deploy:antd:longshan`，目标 `175.178.101.30` / `longshan-web` | 凭据仅写本地 `publish-config.local.json`；批量发布顺序增加 longshan |
| 2026-08-11 | `Feature` | 新增龙山（longshan）独立开发与打包命令，后端 175.178.101.30:86；登录背景视频用 `longshan.mp4` | 新增 `.env.longshan`、`build:longshan`/`dev:longshan`；`brand-assets.ts` 与 `vite.config.mts` 注册 `longshan` 素材目录；视频 OSS Key=`longshan.mp4` |
| 2026-07-30 | `Bugfix` | jiayue/demo 登录页背景视频改为与 jht 共用 `jht-login-back.mp4` | 原 `login-back.mp4` OSS 返回 404；demo 的 `VITE_APP_BRAND=jiayue`，改 jiayue 映射即可同时修好 demo |
| 2026-07-25 | `Feature` | 新增演示环境（demo）开发与打包命令，后端 43.138.14.122:86 | 新增 `.env.demo`，`VITE_APP_BRAND=jiayue` 复用佳越 Logo 与素材，无需改 `brand-assets.ts` / `vite.config.mts`；独立 `VITE_APP_NAMESPACE=vben-web-antd-demo` 隔离缓存 |
| 2026-07-16 | `Feature` | 新增津海通本地构建、MSDeploy 打包、预览与 IIS 发布命令 | 本地配置沿用 `IIS_JHT_*` 命名；产物 API 校验阻止错误 mode 上线 |
| 2026-07-13 | `Fix` | 世纪通达（sjtd）品牌名称与生产 API 更正为 43.138.14.122:84 | `.env.sjtd` 与 `vite.config.mts` dev 代理同步 |
| 2026-07-13 | `Feature` | 新增世纪通达（sjtd）独立打包与开发命令 | 新增 `.env.sjtd`、`build:sjtd`/`dev:sjtd`；`brand-assets.ts` 与 `vite.config.mts` 注册 sjtd 素材目录 |
| 2026-06-16 | `Parsing` | 无 | 解析直接执行 `pnpm vite build --mode jht` 导致 `_app.config.js` 误读 `.env.production`、API 指向 118.190.1.4:82 的根因；明确必须通过 `pnpm build:jht` 打包。 |
