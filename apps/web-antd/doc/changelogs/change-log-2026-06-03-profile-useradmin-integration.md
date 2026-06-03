# 个人中心对接 UserAdmin 与登录态展示修复

## 背景意图

- 个人中心需对接后端 `UserAdmin` 的「我的信息」接口，支持当前登录用户自助维护资料。
- 右上角用户下拉此前写死 `ann.vben@gmail.com`，登录后应展示真实邮箱与头像。
- `#/profile` 为 core 路由，F5 刷新时未走权限/菜单初始化，导致左侧菜单消失、头像回默认。
- `UpdateMyInfoAsync` 为全量更新，不传 `avatar` 会清空头像；界面不展示头像字段时仍需随保存提交。

## 核心逻辑变更

### API（`src/api/core/user.ts`）

| 方法 | 接口 | 说明 |
| :-- | :-- | :-- |
| `getMyInfoApi` | `GET /services/app/UserAdmin/GetMyAsync` | 获取当前用户 `MyDto` |
| `updateMyInfoApi` | `PUT /services/app/UserAdmin/UpdateMyInfoAsync` | 全量更新可编辑字段（含 `avatar`） |
| `updateMyAvatarApi` | `PUT /services/app/UserAdmin/UpdateMyAvatarAsync` | 仅更新头像 URL |
| `changeMyPasswordApi` | `POST /services/app/User/ChangeMyPasswordAsync` | 修改密码（独立页签） |

- `getUserInfoApi`：并行请求 `Session/GetCurrentLoginInformations` 与 `GetMyAsync`，合并 `avatar`、`emailAddress`、`userName`、`nickName` 到 `UserInfo`（登录与路由守卫拉用户信息时生效）。

### 个人中心页（`/profile`）

- **个人信息**（`base-setting.vue`）：两栏表单；只读：用户名、昵称、部门（`公司-部门`）、工号；可编辑：英文名称、手机、邮箱、办公电话、QQ、身份证、性别、个人邮箱密码。
- **修改密码**（`password-setting.vue`）：独立页签，不在基本信息表单维护密码。
- **头像**：表单不展示；左侧头像区悬浮提示「点击上传新头像」→ 上传文件 → `UpdateMyAvatarAsync` → `authStore.fetchUserInfo()` 刷新全局头像。
- **保存基本信息**：提交 `UpdateMyInfoAsync` 时 `avatar` 取 `GetMyAsync` 返回值，若为 `null` 则回退 `userStore.userInfo.avatar`，避免全量更新清空头像。

### 布局与守卫

- `layouts/basic.vue`：用户下拉 `description` 改为 `userInfo.emailAddress`（无则 `username`，再则「未设置邮箱」）。
- `router/guard.ts`：抽取 `ensureAccessInitialized`；core 路由（如 `/profile`）在已登录且非登录页时也会初始化菜单与用户信息；非 core 路由在 `isAccessChecked` 为 true 时直接放行，避免无限重定向。

### 公共组件

- `packages/effects/common-ui/.../profile.vue`：新增 `#avatar` 插槽；`ProfileBaseSetting` 默认 `wrapperClass` 为两栏网格（`md:grid-cols-2`）。

## 避坑指南

- **全量更新**：`UpdateMyInfoAsync` 未传字段会被置空；隐藏字段（如 `avatar`）必须从接口或全局 store 带回。
- **core 路由刷新**：`/profile` 不能仅 `return true`，否则 F5 后 `accessMenus` 为空、头像未合并 `GetMyAsync`。
- **无限重定向**：权限已初始化（`isAccessChecked`）时勿再返回重定向对象，应 `return true`。
- **Store 引用**：`useAuthStore` 来自 `#/store`，不是 `@vben/stores`。

## 涉及文件（主要）

- `apps/web-antd/src/api/core/user.ts`
- `apps/web-antd/src/views/_core/profile/base-setting.vue`
- `apps/web-antd/src/views/_core/profile/index.vue`
- `apps/web-antd/src/views/_core/profile/password-setting.vue`
- `apps/web-antd/src/layouts/basic.vue`
- `apps/web-antd/src/router/guard.ts`
- `packages/effects/common-ui/src/ui/profile/profile.vue`
- `packages/effects/common-ui/src/ui/profile/base-setting.vue`
