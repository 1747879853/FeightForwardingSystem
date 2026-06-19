# 用户管理：编辑时邮箱恢复为非必填

## 背景意图

新建用户时邮箱可为空，但保存后再次打开编辑弹窗时邮箱会显示为必填并拦截保存。业务要求邮箱始终为选填，仅在有值时校验格式与长度。

## 核心逻辑变更

- 调整 `src/views/system/user/data.ts` 中 `emailAddress` 字段校验：
  - 移除基于 `dependencies.rules` 的动态 Zod 规则（`z.string().email()` 会被表单框架判定为必填）
  - 改回适配器内置规则 `email|max:128`（空值跳过校验，有值时校验邮箱格式与最大长度）

## 避坑指南

- 可选字段若需格式校验，优先使用 `adapter/form.ts` 中已定义的 `'email'`、`'max'` 等字符串规则，避免单独使用 `z.string().email()` 触发必填星号。
- 动态 `dependencies.rules` 返回的非 optional Zod schema 会同步影响 UI 必填态与校验行为。
