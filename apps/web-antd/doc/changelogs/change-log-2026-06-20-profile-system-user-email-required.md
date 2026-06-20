# 个人中心与用户管理：邮箱必填与格式校验

## 背景意图

业务要求个人中心（`/profile`）与用户管理（`/system/user`）的邮箱字段为必填，并在填写时校验邮箱格式与最大长度。

## 核心逻辑变更

- `src/views/system/user/data.ts`：`emailAddress` 改用 Zod 规则（`.min(1)` + 邮箱正则 + `.max(128)`），与手机号等字段一致，确保编辑弹窗显示必填星号并拦截空值/非法格式。
- `src/views/_core/profile/base-setting.vue`：同步改用 Zod 规则。

## 避坑指南

- 复合字符串规则 `required|email|max:128` 在表单框架中**不会**识别为必填（`shouldRequired` 仅匹配完整字符串 `required`），编辑弹窗无星号且校验行为与 Zod 字段不一致；必填邮箱应使用 `z.string().min(1)` + 格式 refine，与 `phoneNumber` 写法对齐。
