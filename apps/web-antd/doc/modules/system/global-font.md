---
title: 全局字体配置
module: 系统管理
author: AI助手
last_updated: 2026-06-01
---

# 1. 业务背景说明 (Background)

**白话解释：** 该文档用于说明前端应用全局字体策略，目标是让业务页面文本与 Ant Design 组件文本保持统一观感，避免中文页面出现字体不一致或回退不稳定的问题。

# 2. 功能与操作说明 (Features & Operations)

- **全局字体统一：** 通过 `src/global-font.css` 统一根节点字体，覆盖业务页面常规文本。
- **组件字体统一：** 通过 `ConfigProvider` 主题 token 注入 `fontFamily`，保证 AntD 组件使用同一字体栈。
- **OSS 私有字体加载：** 应用启动时 `initGlobalFonts()` 调用 `GetOssUrlAsync` 获取签名 URL，动态注入 6 个字重的 `@font-face`；objectName 优先 bucket 根路径文件名（如 `Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf`）。
- **本地兜底：** OSS 或接口失败时回退 `src/assets/fonts/Alibaba_PuHuiTi_2.0_*.ttf` 打包资源。
- **生产 SW 缓存：** `build:hhyy` / `build:jht` 部署后，Service Worker 以 `origin+pathname` 缓存 OSS 字体响应，忽略签名查询参数；更新字体内容需 bump `CACHE_VERSION`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 字体来源分散 | 前端初始化加载全局样式与主题 token | 字体来源统一 | 页面文本与组件文本采用一致字体链路。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **fontFamily** | 全局字体回退链，定义优先字体与降级策略。 | 前端静态配置 | **触发/依赖：** 应用启动时加载样式与 `ConfigProvider`。 | 需保证字体名合法，至少包含一个通用回退字体。 |
| **objectName** | OSS 私有桶内字体文件 Key。 | `GET /services/app/Test/GetOssUrlAsync` | **触发/依赖：** `bootstrap` → `initGlobalFonts()`；候选 Key 根路径优先。 | 须与 OSS 实际上传 Key 一致；单 IP 24h 累计 1GB 限流。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：组件库字体未同步]** 仅设置 `body` 级字体时，部分组件仍可能使用组件库默认字体，需同步配置主题 token 中的 `fontFamily`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-01 | `Feature` | 生产环境注册 Service Worker，对 `aliyuncs.com` 字体请求做 Cache Storage 缓存（Key 不含签名参数）。 | `public/service-worker.js` + `register-oss-cache-sw.ts`；dev 模式不注册。 |
| 2026-06-01 | `Feature` | 字体改为启动时经 OSS 私有签名 URL 动态注入 `@font-face`，失败回退本地 TTF；移除 `global-font.css` 静态 `@font-face`。 | `global-font-loader` + `getOssPrivateFileUrlByCandidates`；与登录视频共用 Test 控制器匿名接口。 |
| 2026-05-24 | `Feature` | 全局字体由 PingFang SC 切换为阿里巴巴普惠体 2.0（`Alibaba PuHuiTi`），同步 `@font-face`、CSS 变量与 AntD 主题。 | 无 |
| 2026-05-20 | `Fix` | 将字体别名由 `PingFangSCWeb` 统一改为 `PingFang SC`，并同步全局变量与 AntD 主题。 | 无 |
| 2026-05-20 | `Fix` | 新增 `:root --font-family` 覆盖，修复登录页未跟随全局字体的问题。 | 无 |
| 2026-05-20 | `Feature` | 新增 `@font-face` 并将字体文件路径固定为 `src/assets/fonts/PingFangSC-Regular.woff2`。 | 无 |
| 2026-05-20 | `Feature` | 新增全局字体样式并在应用入口与 AntD 主题层统一字体栈。 | 无 |
