---
title: 登录页
module: 账户与认证
author: auto-doc-sync
last_updated: 2026-08-14
---

# 1. 业务背景说明 (Background)

**白话解释：** 未登录用户进入系统的入口。填写用户名、密码后调用登录接口换取 Token，并拉取用户信息与权限码进入业务页。

**路由与源码定位：**

| 项目     | 内容                                                        |
| :------- | :---------------------------------------------------------- |
| 页面路由 | `/auth/login`（hash 模式为 `#/auth/login`）                 |
| 页面组件 | `src/views/_core/authentication/login.vue`                  |
| 登录布局 | `src/layouts/auth.vue` → `@vben/layouts` `AuthPageLayout`   |
| 登录逻辑 | `src/store/auth.ts` → `authLogin` → `loginApi`              |
| 品牌资源 | `src/utils/brand-assets.ts`、`getBrandRememberMeStorageKey` |

# 2. 功能与操作说明 (Features & Operations)

- **账号密码登录：** 提交用户名、密码；`authLogin` 调用后端登录接口，成功后写入 Token 并跳转首页/原目标页。
- **滑动验证：** 非开发构建下展示 `SliderCaptcha`，未通过不可提交。
- **开发模式跳过验证：** `import.meta.env.DEV === true` 时不渲染滑动验证字段，可直接账号密码登录。
- **记住我：** 按品牌维度使用独立 storage key 持久化。
- **背景视频压暗：** 龙山品牌（`isLongshanBrand`）启用 `loginBackgroundDimmed`，在背景视频上叠加半透明蒙层（当前 `rgb(3 10 24 / 24%)`）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态     | 触发人/动作 | 目标状态     | 状态说明                |
| :----------- | :---------- | :----------- | :---------------------- |
| 未登录       | 打开登录页  | 展示表单     | DEV 无滑动验证；PROD 有 |
| 表单校验通过 | 点击登录    | 请求中       | `loginLoading`          |
| 登录成功     | Token 写入  | 进入业务路由 | 拉取用户信息与权限码    |
| 登录失败     | 接口错误    | 停留登录页   | 提示错误信息            |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **username** | 登录账号 | 表单 → `loginApi.userNameOrEmailAddress` | — | 必填 |
| **password** | 登录密码 | 表单 → `loginApi.password` | — | 必填 |
| **captcha** | 滑动验证结果 | 仅前端 `SliderCaptcha` | DEV 不注入该字段 | 非 DEV 时必须为 `true` |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：非 DEV 必须通过滑动验证]** `import.meta.env.DEV` 为 false 时表单含 `captcha` 必填校验，未拖动成功无法提交。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-14 | `Chore` | 更新 `public/favicon.png` 与 `public/logo.png` 默认品牌位图 | 稳定路径 `/favicon.png`、`/logo.png`；侧栏/偏好回退与浏览器标签共用，无代码逻辑变更 |
| 2026-08-11 | `Style` | 龙山登录页视频蒙层调亮（48% → 24%） | 仅改 `.login-background-mask--dimmed` 透明度 |
| 2026-08-11 | `Feature` | 龙山登录页背景视频增加压暗蒙层 | `auth.vue` 传 `loginBackgroundDimmed=isLongshanBrand`；蒙层样式在 `authentication.vue` |
| 2026-08-02 | `Feature` | 开发模式登录页不再展示/校验滑动验证，生产构建保持原样 | `enableSliderCaptcha = !import.meta.env.DEV`；captcha 不参与 `loginApi` 入参 |
