# GetMyAsync 全量字段同步至 userStore.userInfo

## 背景意图

登录与路由守卫通过 `getUserInfoApi` 合并 `Session/GetCurrentLoginInformations` 与 `UserAdmin/GetMyAsync`，此前 `adaptUserInfo` 仅映射 `avatar`、`emailAddress`、`userName`、`nickName` 等少量字段，其余如 `companyId`、`departmentName`、`phoneNumber` 等未写入 `userStore.userInfo`，业务页无法直接读取。

## 核心逻辑变更

1. **`packages/types/src/user.ts`**：`UserInfo` 补充 `GetMyAsync`（`UserAdminMyDto`）全部可选字段类型定义。
2. **`src/api/core/user.ts`**：`adaptUserInfo` 在构建 `UserInfo` 时展开 `safeMyInfo`，并保留 `username` / `realName` 与 API 字段 `userName` / `nickName` 的双向兼容。
3. **`src/views/_core/profile/base-setting.vue`**：保存基本信息成功后调用 `authStore.fetchUserInfo()`，与头像上传一致，确保右上角及全局 store 即时更新。

## 避坑指南

- `UpdateMyInfoAsync` 为全量更新，保存基本信息时仍需隐式携带有效 `avatar`，避免清空头像。
- `adaptUserInfo` 在 spread `safeMyInfo` 后需再次覆盖 `avatar`、`emailAddress`、`username`、`realName`，防止空值覆盖 Session 侧兜底。
