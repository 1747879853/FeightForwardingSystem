# 用户管理：办公电话与发件显示名对接

## 背景意图

后端 `UserInAdminInputDto` 已支持 `officeTel`、`senderDisplayName`，前端编辑弹窗此前仅展示占位且禁用，无法保存与回显。

## 核心逻辑变更

- `user-admin.ts`：在 `UserListDto`、`UserDto`、`UserInAdminInputDto` 补充 `officeTel`、`senderDisplayName` 类型。
- `user-form.vue`：提交 `CreateOrUpdateUserAsync` 时携带两字段；`GetUserForEditAsync` 回显时写入表单。
- `data.ts`：移除「待后端接口支持」禁用态，启用可编辑输入（`officeTel` max 32，`senderDisplayName` max 64）。

## 避坑指南

- 空字符串提交前统一转为 `undefined`，与其它可选字段保持一致。
- 列表接口若未返回两字段，编辑仍以 `GetUserForEditAsync` 详情为准。
