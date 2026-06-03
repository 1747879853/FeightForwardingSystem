# 个人中心表单布局与修改密码字段调整

## 背景意图

个人中心「个人信息」「修改密码」表单项由左右布局改为标签在上、输入框在下，提升可读性；修改密码与后端 `MyPasswordInputDto` 对齐，不再收集旧密码。

## 核心逻辑变更

- `@vben/common-ui`：`ProfileBaseSetting`、`ProfilePasswordSetting` 的 `useVbenForm` 使用 `layout: vertical`；基本信息网格间距改为 `gap-4`。
- `apps/web-antd`：`password-setting.vue` 移除 `oldPassword` 表单项；提交仍传 `password`、`confirmPassword`。
- 头像悬浮提示文案由「点击上传新头像」改为「上传头像」。

## 避坑指南

- 勿在修改密码表单恢复 `oldPassword` 字段，除非后端 `ChangeMyPasswordAsync` 契约扩展。
- 跨包改动需同时发布/联调 `@vben/common-ui` 与 `@vben/web-antd`。
