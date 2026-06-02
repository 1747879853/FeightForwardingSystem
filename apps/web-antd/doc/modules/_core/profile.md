---
title: 个人中心
module: 账户与认证
author: auto-doc-sync
last_updated: 2026-06-03
---

# 1. 业务背景说明 (Background)

**白话解释：** 当前登录用户查看与维护本人资料（联系方式、英文名称、个人邮箱密码等）、修改登录密码、更换头像的入口。与「系统管理-用户管理」不同，此处仅操作**自己**的数据，接口走 `UserAdmin` 的 `GetMyAsync` / `UpdateMyInfoAsync` 等，权限为登录即可（`[AbpAuthorize]`）。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/profile`（hash 模式为 `#/profile`） |
| 路由名称 | `Profile` |
| 页面组件 | `src/views/_core/profile/index.vue` |
| 子页签 | `base-setting.vue`（个人信息）、`password-setting.vue`（修改密码） |
| 菜单可见 | `hideInMenu: true`，通常从右上角用户下拉进入 |
| 关键源码 | `src/router/routes/core.ts`<br/>`src/api/core/user.ts`<br/>`src/layouts/basic.vue` |

# 2. 功能与操作说明 (Features & Operations)

- **进入个人中心：** 右上角用户头像下拉 →「个人中心」→ 路由 `/profile`。
- **个人信息：** 左侧竖向 Tab「个人信息」；两栏表单展示/编辑字段；底部「更新基本信息」提交 `UpdateMyInfoAsync`。
- **修改密码：** Tab「修改密码」；旧密码、新密码、确认密码；提交 `User/ChangeMyPasswordAsync`。
- **更换头像：** 左侧大头像悬浮显示「点击上传新头像」；选择图片后先走通用上传接口，再 `UpdateMyAvatarAsync`，成功后刷新全局 `userStore` 头像（右上角同步更新）。
- **登录后展示：** `getUserInfoApi` 合并 `GetMyAsync`，右上角邮箱不再使用写死占位邮箱。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 未登录 | 访问 `/profile` | 跳转登录 | 路由守卫检测无 `accessToken` |
| 已登录 | 首次进入业务路由 | 权限已检查 | `ensureAccessInitialized` 拉用户、权限码、生成菜单 |
| 已登录 | F5 刷新 `/profile` | 页面正常 | core 路由分支同样执行初始化，避免菜单/头像丢失 |
| 个人信息已改 | 点击更新基本信息 | 保存成功提示 | 重新 `GetMyAsync` 回填表单 |
| 头像已上传 | 选择图片文件 | 头像已更新 | 调用 `fetchUserInfo` 更新 store |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **userName** | 登录用户名 | `GetMyAsync` | 只读展示 | — |
| **nickName** | 昵称 | `GetMyAsync` | 只读展示 | — |
| **departmentDisplay** | 部门（公司-部门） | `GetMyAsync` 的 `companyName` + `departmentName` 拼接 | 只读；顺序在昵称后、工号前 | — |
| **employeeID** | 工号 | `GetMyAsync` | 只读 | — |
| **enName** | 英文名称 | `GetMyAsync` / `UpdateMyInfoAsync` | 可编辑 | 空串提交为 `null` |
| **phoneNumber** | 手机号 | 同上 | 可编辑 | 空串 → `null` |
| **emailAddress** | 邮箱 | 同上 | 可编辑；登录后亦写入 `userInfo` 供右上角展示 | 空串 → `null` |
| **officeTel** | 办公电话 | 同上 | 可编辑 | 空串 → `null` |
| **qq** | QQ | 同上 | 可编辑 | 空串 → `null` |
| **idNumber** | 身份证号 | 同上 | 可编辑 | 空串 → `null` |
| **gender** | 性别 | 同上 | 可编辑；下拉：0 未知 / 1 男 / 2 女 | 可清空为 `null` |
| **emailPwd** | 个人邮箱密码 | 同上 | 可编辑；密码框展示 | 空串 → `null` |
| **avatar** | 头像 URL | `GetMyAsync`；上传走 `UpdateMyAvatarAsync` | **不在基本信息表单展示**；保存基本信息时隐式提交：`GetMyAsync.avatar` 为空则用 `userStore.userInfo.avatar` | 避免全量更新清空 |
| **oldPassword / newPassword / confirmPassword** | 修改密码 | `ChangeMyPasswordAsync` | 仅在「修改密码」页签 | 见 `password-setting.vue` 校验规则 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：UpdateMyInfoAsync 全量更新]** 后端对未传或为 `null` 的字段会置空。保存基本信息时必须携带当前有效 `avatar`（接口或全局 store），否则头像会被清空。

> [!IMPORTANT] **[卡点 2：/profile 刷新与 core 路由]** `/profile` 属于 `coreRouteNames`，刷新时须在守卫中执行与业务页相同的 `ensureAccessInitialized`，否则左侧菜单为空、用户信息未合并 `GetMyAsync`。

> [!IMPORTANT] **[卡点 3：权限初始化与重定向]** 非 core 路由在 `accessStore.isAccessChecked === true` 时必须 `return true`，否则每次导航返回重定向对象会导致 `Infinite redirect in navigation guard`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-03 | `Feature` | 对接 `UserAdmin` 个人中心：两栏基本信息、独立改密、左侧头像上传；登录合并 `GetMyAsync` 填充右上角邮箱/头像；修复 `#/profile` 刷新菜单丢失与守卫重定向循环；保存时隐式携带 `avatar`。 | `getUserInfoApi` 使用 `Promise.allSettled`；`useAuthStore` 仅 `#/store` 导出；`Profile` 组件 `#avatar` 插槽。详见 [变更日志](../../changelogs/change-log-2026-06-03-profile-useradmin-integration.md)。 |
