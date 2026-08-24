# 权限树优先展示接口中文名

## 背景意图

权限管理「模块权限」里报表、提成配置显示成 `auth.Admin_Report` 这类码。接口 `GetAllPermissions` 已返回中文 `displayName`（报表、利润报表、提成配置），前端却只查 `auth.json`，缺 key 就把 i18n 键原样显示。

## 核心逻辑变更

- `buildPermissionTree` 标签优先用接口 `displayName`。
- `displayName` 为空或 ABP 占位 `[Admin.Xxx]` 时再走 `$t('auth.*')`。
- 勾选/保存仍用权限码 `authCode`，不受展示文案影响。

## 避坑指南

- 不要再靠给 `auth.json` 补键来跟接口同步；新权限以后端名为准。
- `[Admin.Personal setting]` 仍走 i18n，对应「个人设置」。
