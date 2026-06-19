# 个人中心只读字段改为纯文本展示

## 背景意图

个人信息页中用户名、昵称、部门、工号为不可编辑字段，此前使用 `disabled` 的 Input 展示，视觉上仍像输入框，体验不佳。

## 核心逻辑变更

- 新增表单组件 `ReadonlyText`，以纯文本渲染字段值，空值显示 `-`。
- 个人中心 `base-setting.vue` 中四个只读字段改用 `ReadonlyText` 组件。

## 避坑指南

- 只读字段仍保留在表单 schema 中以便 `setValues` 统一回填，提交时这些字段不会被 `updateMyInfoApi` 提交。
